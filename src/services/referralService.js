const Referral = require("../models/referral");

function generateReferralCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

async function generateUniqueReferralCode() {
  for (let i = 0; i < 10; i++) {
    const code = generateReferralCode(8);
    const exists = await Referral.exists({ referralCode: code });
    if (!exists) return code;
  }
  throw new Error("Failed to generate unique referral code");
}

const getReferralDetails = async (userId) => {
  return await Referral.findOne({ userId });
};

async function ensureReferralForUser(userId) {
  let doc = await Referral.findOne({ userId });
  if (doc) return doc;
  const code = await generateUniqueReferralCode();
  doc = await Referral.create({ userId, referralCode: code, referredUsers: [] });
  return doc;
}

module.exports = {
  generateUniqueReferralCode,
  getReferralDetails,
  ensureReferralForUser,
};
