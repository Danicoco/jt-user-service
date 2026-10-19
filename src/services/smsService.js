const axios = require("axios");
const logger = require("../utils/logger");
const { toE164 } = require("../utils/phone");

/**
 * SMS provider abstraction.
 *
 * The provider is picked with the SMS_PROVIDER env var:
 *   "termii" sends real SMS through Termii (https://developers.termii.com/messaging-api)
 *   "log"    (default) writes the message to the server log, for local development
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

function getDriver() {
  const key = (process.env.SMS_PROVIDER || "log").toLowerCase();
  const driver = drivers[key];
  if (!driver) throw new Error(`Unknown SMS_PROVIDER "${key}"`);
  // never pretend to send real OTPs in production
  if (key === "log" && process.env.NODE_ENV === "production") {
    throw new Error('SMS_PROVIDER is not set to a real provider (e.g. "termii") in production');
  }
  return driver;
}

async function sendSms(phoneNumber, message) {
  const to = toE164(phoneNumber);
  return getDriver().send(to, message);
}

async function sendOtpSms(phoneNumber, otp) {
  return sendSms(
    phoneNumber,
    `Your Jamestown verification code is ${otp}. It expires in 10 minutes. Do not share it with anyone.`,
  );
}

module.exports = { sendSms, sendOtpSms };
