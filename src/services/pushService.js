const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const { User } = require("../models/user");

const MULTICAST_LIMIT = 500; // FCM max tokens per sendEachForMulticast call
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

let messaging = null;
let initTried = false;

/**
 * Credentials come from FIREBASE_SERVICE_ACCOUNT: the service account JSON,
 * either raw or base64 encoded. Without it, pushes are skipped (logged) so the
 * rest of the app keeps working in environments without Firebase.
 */
function getClient() {
  if (messaging || initTried) return messaging;
  initTried = true;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn("push: FIREBASE_SERVICE_ACCOUNT not set, push notifications disabled");
    return null;
  }

  try {
    const json = raw.trim().startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    const app = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert(JSON.parse(json)) });
    messaging = getMessaging(app);
  } catch (e) {
    console.error("push: failed to initialise firebase-admin:", e.message);
  }
  return messaging;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// FCM data payload values must be strings
function stringifyData(data = {}) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  return out;
}

/**
 * Collect tokens for the target users.
 * platforms: optional ["android","ios"]; tokens with no known platform are only
 * included when no platform filter is given.
 */
async function collectTokens({ userIds, all, platforms }) {
  const filter = { isDeleted: { $ne: true }, isActive: { $ne: false } };
  if (!all) filter._id = { $in: userIds || [] };

  const users = await User.find(filter).select("_id fcmTokens fcmDevices").lean();

  const wanted = platforms?.length ? new Set(platforms) : null;
  const tokens = new Map(); // token -> userId

  for (const u of users) {
    const platformByToken = new Map(
      (u.fcmDevices || []).map((d) => [d.token, d.platform]),
    );
    const userTokens = new Set([...(u.fcmTokens || []), ...platformByToken.keys()]);
    for (const t of userTokens) {
      if (!t) continue;
      if (wanted && !wanted.has(platformByToken.get(t))) continue;
      tokens.set(t, u._id);
    }
  }
  return tokens;
}

async function removeDeadTokens(deadTokens) {
  if (!deadTokens.length) return;
  await User.updateMany(
    { $or: [{ fcmTokens: { $in: deadTokens } }, { "fcmDevices.token": { $in: deadTokens } }] },
    {
      $pull: {
        fcmTokens: { $in: deadTokens },
        fcmDevices: { token: { $in: deadTokens } },
      },
    },
  );
}

/**
 * Send a push notification.
 * @param {Object} p
 * @param {string[]} [p.userIds] target users (ignored when all = true)
 * @param {boolean} [p.all] send to every active user
 * @param {string[]} [p.platforms] restrict to "android" / "ios"
 * @param {string} p.title
 * @param {string} p.body
 * @param {Object} [p.data] extra key/values delivered to the app
 */
async function sendPush({ userIds, all = false, platforms, title, body, data, imageUrl }) {
  const client = getClient();
  const tokenMap = await collectTokens({ userIds, all, platforms });
  const tokens = [...tokenMap.keys()];

  const result = { targeted: tokens.length, success: 0, failure: 0, skipped: false };
  if (!tokens.length) return result;
  if (!client) return { ...result, skipped: true };

  const dead = [];
  for (const batch of chunk(tokens, MULTICAST_LIMIT)) {
    const resp = await client.sendEachForMulticast({
      tokens: batch,
      notification: { title, body, ...(imageUrl && { imageUrl }) },
      data: stringifyData(data),
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    });
    result.success += resp.successCount;
    result.failure += resp.failureCount;
    resp.responses.forEach((r, i) => {
      if (!r.success && DEAD_TOKEN_CODES.has(r.error?.code)) dead.push(batch[i]);
    });
  }

  await removeDeadTokens(dead).catch((e) =>
    console.error("push: failed to prune dead tokens:", e.message),
  );
  result.pruned = dead.length;
  return result;
}

module.exports = { sendPush };
