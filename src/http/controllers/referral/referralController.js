const Referral = require("../../../models/referral");
const { getReferralDetails, ensureReferralForUser } = require("../../../services/referralService");
const { jsonS, jsonFailed } = require("../../../utils");

const REFERRAL_SIGNUP_URL = process.env.REFERRAL_SIGNUP_URL;

const Controller = {
  getReferralLink: async (req, res) => {
    try {
      const userId = req.user.id;

      let ref = await Referral.findOne({ userId }).lean();
      if (!ref) {
        ref = await ensureReferralForUser(userId); 
      }

      const base = REFERRAL_SIGNUP_URL;
      const referralLink = `${base.replace(/\/+$/,'')}/register?ref=${encodeURIComponent(ref.referralCode)}`;

      return jsonS(res, 200, "Referral link fetched successfully", {
        referralLink,
        referralsCount: (ref.referredUsers || []).length,
      });
    } catch (err) {
      console.error("Error fetching referral link:", err);
      return jsonFailed(res, {}, "Internal Server Error", 500);
    }
  },

  getReferredUsers: async (req, res) => {
    const userId = req.user.id;

    try {
      const referral = await getReferralDetails(userId);

      if (!referral) {
        return jsonS(res, 200, "No referral data found", { referralCount: 0 });
      }

      return jsonS(res, 200, "Referred users fetched successfully", {
        referralCount: referral.referredUsers.length
      });
    } catch (error) {
      console.error("Error fetching referred users:", error);
      return jsonFailed(res, {}, "Failed to fetch referred users", 500);
    }
  },
};

module.exports = Controller;
