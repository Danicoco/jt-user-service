const express = require("express");
const { WaitlistController } = require("../../http/controllers/waitlist");
const auth = require("../../middlewares/ambassadorAuth/authMiddleware");

const router = express.Router();

router.post("/", (req, res, next) => {
  req.body.referralCode = req.query.referralCode || req.body.referralCode;
  WaitlistController.addToWaitlist(req, res, next);
});

router.post("/check-spot", WaitlistController.checkWaitlistSpot);

module.exports = {
    baseUrl: "/waitlist",
    router,
};