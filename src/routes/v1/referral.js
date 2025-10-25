const express = require("express");
const { ReferralController } = require("../../http/controllers/referral");
const auth = require("../../middlewares/ambassadorAuth/authMiddleware");

const router = express.Router();

router.get("/link", auth, ReferralController.getReferralLink);
router.get("/count", auth, ReferralController.getReferredUsers)

module.exports = {
    baseUrl: "/referral",
    router,
};