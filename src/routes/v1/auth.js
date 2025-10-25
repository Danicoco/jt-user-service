const express = require("express");
const { AuthController } = require("../../http/controllers/user");
const auth = require("../../middlewares/ambassadorAuth/authMiddleware");

const router = express.Router();

router.post("/signup", AuthController.signUp);
router.post("/verify/phone-number", AuthController.verifyPhoneNumber);
router.post("/login", AuthController.login);
router.post("/resend/otp", AuthController.resendOtp);
router.post("/send/reset/password/otp", AuthController.sendResetPasswordOtp);
router.post("/verify/otp", AuthController.verifyOtp);
router.patch("/reset/password", AuthController.resetPassword);
router.patch("/pin/create", auth, AuthController.createPin);
router.patch("/reset-pin", auth, AuthController.resetPin);
router.get("/has-pin", auth, AuthController.hasPin);

module.exports = {
  baseUrl: "/auth",
  router,
};