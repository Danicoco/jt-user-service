const { jsonS, jsonFailed } = require("../../../utils");
var jwt = require("jsonwebtoken");
var config = require("../../../config/jwt");
const { User } = require("../../../models/user");
const Referral = require("../../../models/referral");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { errorHandler } = require("../../../utils/errorHandler");
const { getOtp, verifyOtpTemp } = require("../../../helpers/twilio");
const { createWallet } = require("../../../services/walletService");
const { SendEmail } = require("../../../utils/emails/zeptomail");
const { extractReferralCode } = require("../../../utils/referral");
const {
  generateUniqueReferralCode,
} = require("../../../services/referralService");
const verificationTemplate = require("../../../utils/emails/notification-template");
const resendTemplate = require("../../../utils/emails/resend-notification");

const Controller = {
  signUp: async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      gender,
      referralCode,
    } = req.body;

    try {
      const normalizedEmail = String(email || "").toLowerCase();
      const userExists = await User.findOne({
        email: { $regex: new RegExp("^" + normalizedEmail, "i") },
      });
      const numberExists = await User.findOne({ phoneNumber });
      if (userExists)
        return jsonFailed(
          res,
          {},
          "An account already exists with this email",
          400,
        );
      if (numberExists)
        return jsonFailed(
          res,
          {},
          "An account already exists with this PhoneNumber",
          400,
        );

      const incomingRefCode = extractReferralCode(req);

      const hashedPassword = bcrypt.hashSync(password, 8);
      const newUserId = uuidv4();

      let referrer = null;
      if (incomingRefCode) {
        referrer = await Referral.findOne({
          referralCode: incomingRefCode,
        }).lean();
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      const newUserData = {
        _id: newUserId,
        firstName,
        lastName,
        email: normalizedEmail,
        password: hashedPassword,
        phoneNumber,
        gender,
        otp,
        ...(referrer?.userId ? { referredBy: referrer.userId } : {}),
      };

      const newUser = await User.create(newUserData);

      if (referrer?.userId) {
        await Referral.updateOne(
          { userId: referrer.userId },
          { $addToSet: { referredUsers: newUserId } },
          { upsert: true },
        );
      }

      SendEmail(
        newUser,
        "Verify Your Account",
        verificationTemplate(newUser.firstName, otp),
      );

      return jsonS(res, 200, "success", {});
    } catch (error) {
      console.error(error);
      errorHandler(error, req, res);
      return jsonFailed(res, {}, "server error", 500);
    }
  },

  login: async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email: email.toLowerCase() }).select(
        "+password",
      );

      if (!user) return jsonFailed(res, null, "Wrong Credentials");

      if (user.isVerified === false) {
        return jsonS(res, 200, "Verification required", {
          isVerified: false,
          requiresVerification: true,
          phoneNumber: user.phoneNumber,
          email: user.email,
        });
      }

      if (user.isActive === false) {
        return jsonFailed(res, {}, "Account disabled", 403);
      }

      const passwordIsValid = await bcrypt.compare(password, user.password);
      if (!passwordIsValid) return jsonFailed(res, null, "Wrong Credentials");

      req.session.user = user;
      const token = Controller.getToken(user);
      return jsonS(res, 200, "success", token, {});
    } catch (error) {
      console.error(error);
      errorHandler(error, req, res);
      return jsonFailed(res, {}, "server error", 500);
    }
  },

  verifyPhoneNumber: async (req, res) => {
    const { phoneNumber, otp } = req.body;
    // let { token } = req.params; // temporily by passing token sent from twilio because of the free account
    try {
      if (!otp) return jsonFailed(res, null, "OTP cannot be empty", 400);
      if (!phoneNumber)
        return jsonFailed(res, null, "Phone Number cannot be empty", 400);
      // if (!token) return jsonFailed(res, null, "token cannot be empty", 400);
      const user = await User.findOne({
        phoneNumber: phoneNumber,
        isVerified: 0,
      });
      
      if (user) {
        if (user.otp !== otp) return jsonFailed(res, null, "User not found");        
        await User.findOneAndUpdate({ _id: user._id }, { otp: '', isVerified: true });
        return jsonS(res, 200, "User verified");
      } else {
        return jsonFailed(res, null, "User not found");
      }
    } catch (e) {
      console.error(e);
      return jsonFailed(res, {}, "Internal Server Error", 500);
    }
  },

  resendOtp: async (req, res) => {
    try {
      const { phoneNumber, email } = req.body;
      const user = await User.findOne({
        ...(phoneNumber && { phoneNumber }),
        ...(email && { email }),
      });

      if (user) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await User.findOneAndUpdate({ _id: user._id }, { otp });

        SendEmail(
          user,
          "Reset Your Password",
          resendTemplate(user.firstName, otp),
        );
      }
      return jsonS(res, 200, "success", {}, {});
    } catch (error) {
      console.error(error);
      return jsonFailed(res, null, "Unable to verify number");
    }
  },

  getToken: (user) => {
    var token = jwt.sign(
      { id: user._id, ...user.toJSON(), is_user: true },
      config.jwt_secret,
      {
        expiresIn: 7776000, // expires in 90 days
      },
    );
    var data = {
      email: user.email,
      phoneNumber: user.phoneNumber,
      isVerified: user.isVerified,
      is_user: true,
      token: token,
      token_type: "jwt",
      expiresIn: 7776000,
    };
    return data;
  },

  sendResetPasswordOtp: async (req, res) => {
    const { email } = req.body;

    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return jsonFailed(res, {}, "User not found", 404);
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      const otpExpires = Date.now() + 1800000;
      await User.updateOne({ _id: user._id }, { otp, otpExpires });

      const subject = "Reset Password Otp";
      const text = `Your otp is ${otp}. Kindly note that this will expire in 30 minutes. Cheers!`;

      SendEmail(
        user,
        "Reset Your Password",
        resendTemplate(user.firstName, text),
      );

      return jsonS(res, 200, "Opt has been sent to your mail.");
    } catch (error) {
      return jsonFailed(res, {}, "Internal server error", 400);
    }
  },

  verifyOtp: async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return jsonFailed(res, {}, "Email and OTP are required.", 400);
    }

    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return jsonFailed(res, {}, "Invalid Account", 400);
      const storedOtp = user.otp;
      const otpExpires = user.otpExpires;

      if (Date.now() > otpExpires) {
        return jsonFailed(
          res,
          {},
          "OTP expired. Please request a new one.",
          400,
        );
      }

      if (otp !== storedOtp) {
        return jsonFailed(res, {}, "Invalid OTP. Please try again.", 400);
      }

      return jsonS(res, 200, "OTP verified successfully.");
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return jsonFailed(res, {}, "Internal server error.", 500);
    }
  },

  resetPassword: async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return jsonFailed(res, {}, "Email and new password are required.", 400);
    }

    try {
      if (!req.session.isOtpVerified) {
        return jsonFailed(
          res,
          {},
          "OTP not verified. You cannot reset your password.",
          403,
        );
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return jsonFailed(res, {}, "User not found.", 404);
      }

      const hashedPassword = bcrypt.hashSync(newPassword, 8);

      user.password = hashedPassword;

      await User.updateOne(
        { _id: user._id },
        { $set: { password: hashedPassword } },
      );

      req.session.isOtpVerified = false;

      return jsonS(res, 200, "Password reset successfully.");
    } catch (error) {
      console.error("Error resetting password:", error);
      return jsonFailed(res, {}, "Internal server error.", 500);
    }
  },

  createPin: async (req, res) => {
    const { pin } = req.body;
    const { id } = req.user;

    if (!pin) return jsonFailed(res, null, "No PIN entered");

    if (!/^\d{4,6}$/.test(pin)) {
      return jsonFailed(res, null, "PIN must be 4 to 6 digits");
    }

    try {
      const hashedPin = bcrypt.hashSync(pin, 8);
      const user = await User.findOne({ _id: id });
      if (!user) return jsonFailed(res, null, "User not found");

      await User.updateOne({ _id: id }, { $set: { pin: hashedPin } });
      return jsonS(res, 200, "PIN created successfully", {}, {});
    } catch (error) {
      console.error("Error setting PIN:", error);
      return jsonFailed(res, null, "Internal Server Error", 500);
    }
  },

  resetPin: async (req, res) => {
    const { oldPin, newPin } = req.body;
    const userId = req.user.id;

    if (!oldPin || !newPin) {
      return jsonFailed(res, {}, "oldPin and newPin are required", 400);
    }
    if (!/^\d{4,6}$/.test(newPin)) {
      return jsonFailed(res, {}, "newPin must be 4 to 6 digits", 400);
    }

    try {
      const user = await User.findById(userId).select("+pin");
      if (!user) {
        return jsonFailed(res, {}, "User not found", 404);
      }

      const valid = bcrypt.compareSync(oldPin, user.pin);
      if (!valid) {
        return jsonFailed(res, {}, "Invalid current PIN", 401);
      }

      const hashed = bcrypt.hashSync(newPin, 8);
      await User.updateOne({ _id: userId }, { $set: { pin: hashed } });

      return jsonS(res, 200, "PIN reset successfully");
    } catch (err) {
      console.error("resetPin error:", err);
      return jsonFailed(res, {}, "Internal Server Error", 500);
    }
  },

  verifyPin: async (req, res) => {
    const { userId, pin } = req.body;

    if (!userId || !pin) {
      return jsonFailed(res, {}, "userId and pin are required", 400);
    }

    try {
      const user = await User.findById(userId).select("+pin");
      if (!user) {
        return jsonFailed(res, {}, "User not found", 400);
      }

      const isValid = bcrypt.compareSync(pin, user.pin);
      if (!isValid) {
        return jsonFailed(res, {}, "Invalid pin", 401);
      }
      return jsonS(res, 200, "Pin verified");
    } catch (err) {
      console.error("Error verifying pin:", err);
      return jsonFailed(res, {}, "Internal server error", 500);
    }
  },

  hasPin: async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId).select("+pin");
      if (!user) return jsonFailed(res, {}, "User not found", 404);

      const hasPin = Boolean(user.pin && String(user.pin).length);
      return jsonS(res, 200, "OK", { hasPin });
    } catch (err) {
      console.error("hasPin error:", err);
      return jsonFailed(res, {}, "Internal Server Error", 500);
    }
  },
};
module.exports = Controller;
