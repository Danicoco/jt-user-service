const { User } = require("../models/user");

// Short cache so the auth middleware doesn't hit the DB on every request.
// A deactivation therefore takes effect within CACHE_MS.
const CACHE_MS = 15 * 1000;
const cache = new Map(); // userId -> { blocked, reason, at }

/**
 * Whether a user may use the API. Blocked when deactivated, deleted or flagged
 * by the BVN watchlist.
 * @returns {Promise<{ blocked: boolean, reason?: string }>}
 */
async function getAccountStatus(userId) {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit;

  const user = await User.findById(userId).select("isActive isDeleted watchlistFlag").lean();
  let status;
  if (!user || user.isDeleted) status = { blocked: true, reason: "Account not found" };
  else if (user.watchlistFlag?.flagged && user.isActive === false)
    status = { blocked: true, reason: "Account restricted. Please contact support." };
  else if (user.isActive === false) status = { blocked: true, reason: "Account disabled" };
  else status = { blocked: false };

  cache.set(userId, { ...status, at: Date.now() });
  return status;
}

function clearAccountStatus(userId) {
  cache.delete(String(userId));
}

module.exports = { getAccountStatus, clearAccountStatus };
