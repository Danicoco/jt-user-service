const { User } = require("../models/user");
const SnapCapiEvent = require("../models/snapCapiEvent");

// Snap Conversions API, user-service side: store the device details the app
// sends, and queue SIGN_UP. Sending happens in jt-wallet-service.

const enabled = () => process.env.SNAP_CAPI_ENABLED === "true";

const EXTINFO_LENGTH = 16;
const str = (v, max = 256) =>
  v === undefined || v === null ? undefined : String(v).trim().slice(0, max) || undefined;

// iOS returns all zeros when tracking isn't authorised
const isZeroId = (v) => /^[0-]+$/.test(v);

/**
 * Build a sanitised device snapshot from the request: the optional `device`
 * object the mobile app sends in the body, plus the caller's IP and user agent.
 * Returns undefined when the app sent no device object.
 *
 * Expected body shape (all fields optional):
 *   device: {
 *     platform: "ios" | "android",
 *     advertisingId: "<IDFA or GAID>",
 *     idfv: "<iOS identifier for vendor>",
 *     installId: "<uuid persisted on first launch>",
 *     trackingEnabled: true | false,   // iOS ATT authorised / Android ads personalisation on
 *     extinfo: [16 strings, in Snap's order, starting "i2" or "a2"]
 *   }
 */
function deviceFromRequest(req) {
  const d = req.body?.device;
  if (!d || typeof d !== "object" || Array.isArray(d)) return undefined;

  let platform = ["ios", "android"].includes(d.platform) ? d.platform : undefined;

  let extinfo;
  if (Array.isArray(d.extinfo) && d.extinfo.length) {
    extinfo = Array.from({ length: EXTINFO_LENGTH }, (_, i) =>
      d.extinfo[i] === undefined || d.extinfo[i] === null ? "" : String(d.extinfo[i]).slice(0, 128),
    );
    if (!platform && extinfo[0] === "i2") platform = "ios";
    if (!platform && extinfo[0] === "a2") platform = "android";
  }

  const trackingEnabled = d.trackingEnabled === true || d.trackingEnabled === 1 || d.trackingEnabled === "1";
  let advertisingId = str(d.advertisingId, 64)?.toLowerCase();
  if (!trackingEnabled || (advertisingId && isZeroId(advertisingId))) advertisingId = undefined;

  return {
    platform,
    advertisingId,
    idfv: str(d.idfv, 64),
    installId: str(d.installId, 64),
    trackingEnabled,
    extinfo,
    ip: str(req.ip, 64),
    userAgent: str(req.get?.("user-agent"), 512),
    updatedAt: new Date(),
  };
}

/** Save the device snapshot on the user. Never throws. */
async function recordDevice(userId, req) {
  if (!enabled()) return undefined;
  try {
    const device = deviceFromRequest(req);
    if (!device) return undefined;
    await User.updateOne({ _id: userId }, { $set: { adDevice: device } });
    return device;
  } catch (e) {
    console.error("snap capi: recordDevice failed:", e.message);
    return undefined;
  }
}

/** Queue SIGN_UP for a user. Idempotent per user. Never throws. */
async function enqueueSignUp(userId, device) {
  if (!enabled()) return;
  try {
    await SnapCapiEvent.updateOne(
      { _id: `signup:${userId}` },
      {
        $setOnInsert: {
          eventName: "SIGN_UP",
          userId,
          eventTime: new Date(),
          ...(device && { device }),
          status: "pending",
          attempts: 0,
          nextAttemptAt: new Date(),
        },
      },
      { upsert: true },
    );
  } catch (e) {
    console.error("snap capi: enqueueSignUp failed:", e.message);
  }
}

module.exports = { deviceFromRequest, recordDevice, enqueueSignUp };
