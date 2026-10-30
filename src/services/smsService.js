const axios = require("axios");
const logger = require("../utils/logger");
const { toE164 } = require("../utils/phone");

/**
 * SMS provider abstraction.
 *
 * The provider is picked with the SMS_PROVIDER env var:
 *   "sendar"         (default) sends real SMS through Sendar (https://sendar.io)
 *   "africastalking" sends real SMS through Africa's Talking
 *                    (https://developers.africastalking.com/docs/sms/overview)
 *   "termii"         sends real SMS through Termii (https://developers.termii.com/messaging-api)
 *   "twilio"         phone OTPs through Twilio Verify (https://www.twilio.com/docs/verify/api);
 *                    Twilio makes, sends and checks the code, so no free-text SMS
 *   "log"            writes the message to the server log, for local development
 *
 * Sendar env:
 *   SENDAR_API_KEY      API key (sk_live_... or sk_test_...)
 *   SENDAR_SENDER_ID    registered sender name
 *   SENDAR_WALLET_TYPE  billing wallet, "transactional" (default) or "promotional"
 *   SENDAR_BASE_URL     optional, defaults to https://sms-submit.sendar.io
 *
 * Africa's Talking env:
 *   AT_USERNAME   app username ("sandbox" for the sandbox app)
 *   AT_API_KEY    API key (dashboard > Settings > API Key)
 *   AT_SENDER_ID  optional approved sender ID / short code; omitted = AT default sender
 *   AT_SANDBOX    "true" to use the sandbox API (implied when AT_USERNAME is "sandbox")
 *
 * Twilio env:
 *   TWILIO_ACCOUNT_SID         Account SID (falls back to ACCOUNT_SID)
 *   TWILIO_AUTH_TOKEN          Auth token (falls back to AUTH_TOKEN)
 *   TWILIO_VERIFY_SERVICE_SID  Verify Service SID, VA... (falls back to VERIFY_SERVICE_SID)
 *
 * Termii env:
 *   TERMII_API_KEY    API key (Termii dashboard > Settings > API token)
 *   TERMII_BASE_URL   your account's base URL from the Termii dashboard
 *   TERMII_SENDER_ID  approved sender ID (3-11 characters)
 *   TERMII_CHANNEL    "dnd" (default; delivers OTPs to DND numbers, must be
 *                     activated by Termii support) or "generic"
 */
const drivers = {
  log: {
    async send(to, message) {
      // warn so it shows in non-development log levels until a real provider is wired in
      logger.warn(`[SMS:log] to=${to} message="${message}"`);
      return { provider: "log", status: "queued" };
    },
  },

  sendar: {
    async send(to, message) {
      const { SENDAR_API_KEY, SENDAR_SENDER_ID, SENDAR_WALLET_TYPE, SENDAR_BASE_URL } = process.env;
      if (!SENDAR_API_KEY || !SENDAR_SENDER_ID) {
        throw new Error("Sendar is not configured (SENDAR_API_KEY, SENDAR_SENDER_ID)");
      }
      const base = (SENDAR_BASE_URL || "https://sms-submit.sendar.io").replace(/\/+$/, "");
      const type = SENDAR_WALLET_TYPE || "transactional";
      console.log({
        SENDAR_API_KEY,
        SENDAR_BASE_URL,
        SENDAR_SENDER_ID,
        SENDAR_WALLET_TYPE,
        type
      });
      const payload = [
        {
          number: to.replace(/^\+/, ""), // international format without "+"
          body: message,
          // non-ASCII text (emoji, accents) must go as unicode
          sms_type: /[^\x00-\x7F]/.test(message) ? "unicode" : "plain",
        },
      ]
      console.log({ payload })
      let resp;
      try {
        resp = await axios.post(
          `${base}/api/sms/send`,
          {
            contact: payload,
            sender_id: SENDAR_SENDER_ID,
            wallet_type: type
          },
          { headers: { "API-KEY": SENDAR_API_KEY }, timeout: 15000, validateStatus: () => true },
        );
        console.log({ resp });
      } catch (err) {
        throw new Error(`Sendar request failed: ${err.message}`);
      }
      const body = resp.data || {};
      const result = (body.data || [])[0];
      if (resp.status >= 300 || body.status !== true || (result && /fail|reject/i.test(result.status || ""))) {
        const reason = body.message || body.detail || (result && result.status) || JSON.stringify(body).slice(0, 200);
        throw new Error(`Sendar rejected the message (HTTP ${resp.status}): ${reason}`);
      }
      return { provider: "sendar", status: "sent", messageId: result && result.message_id };
    },
  },

  africastalking: {
    async send(to, message) {
      const { AT_USERNAME, AT_API_KEY, AT_SENDER_ID, AT_SANDBOX } = process.env;
      if (!AT_USERNAME || !AT_API_KEY) {
        throw new Error("Africa's Talking is not configured (AT_USERNAME, AT_API_KEY)");
      }
      const sandbox = AT_USERNAME === "sandbox" || String(AT_SANDBOX).toLowerCase() === "true";
      const url = sandbox
        ? "https://api.sandbox.africastalking.com/version1/messaging"
        : "https://api.africastalking.com/version1/messaging";
      const form = new URLSearchParams({ username: AT_USERNAME, to, message });
      if (AT_SENDER_ID) form.append("from", AT_SENDER_ID);
      let resp;
      try {
        resp = await axios.post(url, form.toString(), {
          headers: {
            apiKey: AT_API_KEY,
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 15000,
          validateStatus: () => true,
        });
      } catch (err) {
        throw new Error(`Africa's Talking request failed: ${err.message}`);
      }
      const data = (resp.data && resp.data.SMSMessageData) || {};
      const recipient = (data.Recipients || [])[0];
      // 100 Processed, 101 Sent, 102 Queued; anything else (403 InvalidPhoneNumber, 405 InsufficientBalance, ...) failed
      if (resp.status >= 300 || !recipient || ![100, 101, 102].includes(Number(recipient.statusCode))) {
        const reason = recipient
          ? `${recipient.status} (${recipient.statusCode})`
          : data.Message || (typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data || {})).slice(0, 200);
        throw new Error(`Africa's Talking rejected the message (HTTP ${resp.status}): ${reason}`);
      }
      return { provider: "africastalking", status: "sent", messageId: recipient.messageId };
    },
  },

  // Twilio is used through Verify (below), which only sends its own OTP codes
  twilio: {
    async send() {
      throw new Error('SMS_PROVIDER "twilio" uses Twilio Verify, which can only send verification codes');
    },
  },

  termii: {
    async send(to, message) {
      const { TERMII_API_KEY, TERMII_BASE_URL, TERMII_SENDER_ID, TERMII_CHANNEL } = process.env;
      if (!TERMII_API_KEY || !TERMII_BASE_URL || !TERMII_SENDER_ID) {
        throw new Error("Termii is not configured (TERMII_API_KEY, TERMII_BASE_URL, TERMII_SENDER_ID)");
      }
      const base = /^https?:\/\//.test(TERMII_BASE_URL) ? TERMII_BASE_URL : `https://${TERMII_BASE_URL}`;
      let resp;
      try {
        resp = await axios.post(
          `${base.replace(/\/+$/, "")}/api/sms/send`,
          {
            api_key: TERMII_API_KEY,
            to: to.replace(/^\+/, ""), // international format without "+"
            from: TERMII_SENDER_ID,
            sms: message,
            type: "plain",
            channel: TERMII_CHANNEL || "dnd",
          },
          { timeout: 15000, validateStatus: () => true },
        );
      } catch (err) {
        throw new Error(`Termii request failed: ${err.message}`);
      }
      const body = resp.data || {};
      if (resp.status >= 300 || (body.code && body.code !== "ok")) {
        throw new Error(`Termii rejected the message (HTTP ${resp.status}): ${body.message || JSON.stringify(body).slice(0, 200)}`);
      }
      return { provider: "termii", status: "sent", messageId: body.message_id_str || body.message_id };
    },
  },
};

/**
 * Twilio Verify client: start a verification (Twilio texts its own code) and
 * check the code the user typed.
 */
const twilioVerify = {
  async request(path, params) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID || process.env.VERIFY_SERVICE_SID;
    if (!accountSid || !authToken || !serviceSid) {
      throw new Error("Twilio Verify is not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID)");
    }
    try {
      return await axios.post(
        `https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/${path}`,
        new URLSearchParams(params).toString(),
        {
          auth: { username: accountSid, password: authToken },
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 15000,
          validateStatus: () => true,
        },
      );
    } catch (err) {
      throw new Error(`Twilio Verify request failed: ${err.message}`);
    }
  },

  rejected(resp) {
    const body = resp.data || {};
    const reason = body.message || JSON.stringify(body).slice(0, 200);
    return new Error(`Twilio Verify rejected the request (HTTP ${resp.status}): ${reason}${body.code ? ` (code ${body.code})` : ""}`);
  },

  async start(to) {
    const resp = await this.request("Verifications", { To: to, Channel: "sms" });
    if (resp.status >= 300) throw this.rejected(resp);
    return { provider: "twilio", status: resp.data.status, messageId: resp.data.sid };
  },

  /** @returns {Promise<"approved"|"invalid"|"expired"|"too_many">} */
  async check(to, code) {
    const resp = await this.request("VerificationCheck", { To: to, Code: code });
    const body = resp.data || {};
    // 20404: no pending verification (expired, already used or never started)
    if (resp.status === 404 || body.code === 20404) return "expired";
    // 60202: max check attempts reached for this verification
    if (resp.status === 429 || body.code === 60202) return "too_many";
    if (resp.status >= 300) throw this.rejected(resp);
    return body.status === "approved" ? "approved" : "invalid";
  },
};

const providerKey = (provider) => (provider || process.env.SMS_PROVIDER || "sendar").toLowerCase();

/** Whether phone OTPs go through Twilio Verify instead of our own code + SMS. */
function usesTwilioVerify(provider) {
  return providerKey(provider) === "twilio";
}

async function startPhoneVerification(phoneNumber) {
  return twilioVerify.start(toE164(phoneNumber));
}

async function checkPhoneVerification(phoneNumber, code) {
  return twilioVerify.check(toE164(phoneNumber), code);
}

function getDriver(provider) {
  const key = providerKey(provider);
  const driver = drivers[key];
  if (!driver) throw new Error(`Unknown SMS_PROVIDER "${key}"`);
  // never pretend to send real OTPs in production
  if (key === "log" && process.env.NODE_ENV === "production") {
    throw new Error('SMS_PROVIDER is not set to a real provider (e.g. "sendar") in production');
  }
  return driver;
}

// `provider` overrides SMS_PROVIDER for this one message (used by the internal SMS test endpoint)
async function sendSms(phoneNumber, message, { provider } = {}) {
  const to = toE164(phoneNumber);
  return getDriver(provider).send(to, message);
}

async function sendOtpSms(phoneNumber, otp) {
  return sendSms(
    phoneNumber,
    `Your Jamestown verification code is ${otp}. It expires in 10 minutes. Do not share it with anyone.`,
  );
}

module.exports = {
  sendSms,
  sendOtpSms,
  usesTwilioVerify,
  startPhoneVerification,
  checkPhoneVerification,
  SMS_PROVIDERS: Object.keys(drivers),
};
