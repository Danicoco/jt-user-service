// Nigerian mobile numbers accepted at sign up: 11 digits, local format,
// starting with one of the prefixes below.
const ALLOWED_PREFIXES = ["070", "080", "081", "090", "091"];

/**
 * Normalize a Nigerian phone number to local 11-digit format (0XXXXXXXXXX).
 * Accepts "+2348012345678", "2348012345678", "08012345678" and strips spaces/dashes.
 * Returns the input (trimmed, digits only) if it can't be normalized.
 */
function normalizeNigerianPhone(raw) {
  let digits = String(raw || "").replace(/[\s\-()]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("234") && digits.length === 13) {
    digits = `0${digits.slice(3)}`;
  }
  return digits;
}

function isValidNigerianPhone(phone) {
  if (!/^\d{11}$/.test(phone)) return false;
  return ALLOWED_PREFIXES.some((p) => phone.startsWith(p));
}

/**
 * Convert local format (08012345678) to E.164 (+2348012345678) for SMS providers.
 */
function toE164(phone) {
  const local = normalizeNigerianPhone(phone);
  return local.startsWith("0") ? `+234${local.slice(1)}` : `+${local}`;
}

const PHONE_RULE_MESSAGE = `Phone number must be 11 digits and start with ${ALLOWED_PREFIXES.join(", ")}`;

module.exports = {
  ALLOWED_PREFIXES,
  PHONE_RULE_MESSAGE,
  normalizeNigerianPhone,
  isValidNigerianPhone,
  toE164,
};
