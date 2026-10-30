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
const {
  sendOtpSms,
  usesTwilioVerify,
  startPhoneVerification,
  checkPhoneVerification,
} = require("../../../services/smsService");
const {
  normalizeNigerianPhone,
  isValidNigerianPhone,
  PHONE_RULE_MESSAGE,
} = require("../../../utils/phone");

const crypto = require("crypto");

const PHONE_OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PHONE_OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute
const PHONE_OTP_MAX_ATTEMPTS = 5;
// stored in place of the code hash when Twilio Verify holds the code
const TWILIO_VERIFY_OTP = "twilio-verify";

async function issuePhoneOtp(user) {
  const viaVerify = usesTwilioVerify();
  const otp = crypto.randomInt(100000, 1000000).toString();
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        phoneOtp: viaVerify ? TWILIO_VERIFY_OTP : bcrypt.hashSync(otp, 8),
        phoneOtpExpires: new Date(Date.now() + PHONE_OTP_TTL_MS),
        phoneOtpAttempts: 0,
        phoneOtpSentAt: new Date(),
      },
    },
  );
  try {
    if (viaVerify) await startPhoneVerification(user.phoneNumber);
    else await sendOtpSms(user.phoneNumber, otp);
  } catch (err) {
    // the SMS didn't go out: don't make the user wait out the resend cooldown
    await User.updateOne({ _id: user._id }, { $unset: { phoneOtpSentAt: "" } });
    throw err;
  }
}

/**
 * Send a phone OTP unless one went out within the cooldown.
 * @returns {Promise<boolean>} whether a code was sent now
 */
async function sendPhoneOtpIfDue(user) {
  const fresh = await User.findById(user._id).select("+phoneOtpSentAt").lean();
  const last = fresh?.phoneOtpSentAt ? new Date(fresh.phoneOtpSentAt).getTime() : 0;
  if (Date.now() - last < PHONE_OTP_RESEND_COOLDOWN_MS) return false;
  await issuePhoneOtp(user);
  return true;
}

const Controller = {
  signUp: async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      password,
      gender,
      referralCode,
    } = req.body;
    const phoneNumber = normalizeNigerianPhone(req.body.phoneNumber);

    if (!isValidNigerianPhone(phoneNumber)) {
      return jsonFailed(res, {}, PHONE_RULE_MESSAGE, 400);
    }

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

      // phone verification is required before an account can be used
      // if (!user.isPhoneVerified) {
      //   let otpSent = false;
      //   try {
      //     otpSent = await sendPhoneOtpIfDue(user);
      //   } catch (e) {
      //     console.error("login phone otp error:", e.message);
      //   }
      //   return jsonS(res, 200, "Phone verification required", {
      //     isPhoneVerified: false,
      //     requiresPhoneVerification: true,
      //     phoneNumber: user.phoneNumber,
      //     email: user.email,
      //     otpSent,
      //   });
      // }

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
    const { otp } = req.body;
    const phoneNumber = req.body.phoneNumber
      ? normalizeNigerianPhone(req.body.phoneNumber)
      : req.body.phoneNumber;
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

        // next step: verify the phone number by SMS
        let otpSent = false;
        if (!user.isPhoneVerified) {
          try {
            otpSent = await sendPhoneOtpIfDue(user);
          } catch (e) {
            console.error("post-email phone otp error:", e.message);
          }
        }
        return jsonS(res, 200, "User verified", {
          isVerified: true,
          isPhoneVerified: Boolean(user.isPhoneVerified),
          requiresPhoneVerification: !user.isPhoneVerified,
          phoneNumber: user.phoneNumber,
          otpSent,
        });
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
      const { email } = req.body;
      const phoneNumber = req.body.phoneNumber
        ? normalizeNigerianPhone(req.body.phoneNumber)
        : undefined;
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

  sendPhoneOtp: async (req, res) => {
    const phoneNumber = normalizeNigerianPhone(req.body.phoneNumber);
    if (!isValidNigerianPhone(phoneNumber)) {
      return jsonFailed(res, {}, PHONE_RULE_MESSAGE, 400);
    }

    try {
      const user = await User.findOne({ phoneNumber }).select(
        "+phoneOtpSentAt",
      );
      // same response whether or not the number exists, to avoid leaking accounts
      if (!user) return jsonS(res, 200, "If the number exists, an OTP has been sent");

      if (user.isPhoneVerified) {
        return jsonFailed(res, {}, "Phone number already verified", 400);
      }
      // the phone OTP comes after email verification
      if (!user.isVerified) {
        return jsonS(res, 200, "If the number exists, an OTP has been sent");
      }

      const lastSent = user.phoneOtpSentAt ? user.phoneOtpSentAt.getTime() : 0;
      const waitMs = lastSent + PHONE_OTP_RESEND_COOLDOWN_MS - Date.now();
      if (waitMs > 0) {
        return jsonFailed(
          res,
          { retryAfterSeconds: Math.ceil(waitMs / 1000) },
          "Please wait before requesting another OTP",
          429,
        );
      }

      try {
        await issuePhoneOtp(user);
      } catch (err) {
        console.error("sendPhoneOtp SMS error:", err.message);
        return jsonFailed(res, {}, "We couldn't send the SMS right now. Please try again shortly.", 503);
      }
      return jsonS(res, 200, "If the number exists, an OTP has been sent");
    } catch (error) {
      console.error("sendPhoneOtp error:", error);
      return jsonFailed(res, {}, "Internal Server Error", 500);
    }
  },

  verifyPhoneOtp: async (req, res) => {
    const phoneNumber = normalizeNigerianPhone(req.body.phoneNumber);
    const otp = String(req.body.otp || "").trim();

    if (!otp) return jsonFailed(res, {}, "OTP cannot be empty", 400);
    if (!isValidNigerianPhone(phoneNumber)) {
      return jsonFailed(res, {}, PHONE_RULE_MESSAGE, 400);
    }

    try {
      const user = await User.findOne({ phoneNumber }).select(
        "+phoneOtp +phoneOtpExpires +phoneOtpAttempts",
      );
      // a retry/double submit after success shouldn't look like a failure
      if (user?.isPhoneVerified) {
        return jsonS(res, 200, "Phone number already verified");
      }
      if (!user || !user.phoneOtp) {
        return jsonFailed(res, {}, "Invalid or expired OTP", 400);
      }
      if (!user.phoneOtpExpires || Date.now() > user.phoneOtpExpires.getTime()) {
        return jsonFailed(res, {}, "OTP expired. Please request a new one.", 400);
      }
      if ((user.phoneOtpAttempts || 0) >= PHONE_OTP_MAX_ATTEMPTS) {
        return jsonFailed(
          res,
          {},
          "Too many attempts. Please request a new OTP.",
          429,
        );
      }

      // decided by how this code was sent, so switching SMS_PROVIDER doesn't break codes already out
      if (user.phoneOtp === TWILIO_VERIFY_OTP) {
        let result;
        try {
          result = await checkPhoneVerification(phoneNumber, otp);
        } catch (err) {
          console.error("verifyPhoneOtp Twilio Verify error:", err.message);
          return jsonFailed(res, {}, "We couldn't check the code right now. Please try again shortly.", 503);
        }
        if (result === "expired") {
          return jsonFailed(res, {}, "OTP expired. Please request a new one.", 400);
        }
        if (result === "too_many") {
          return jsonFailed(res, {}, "Too many attempts. Please request a new OTP.", 429);
        }
        if (result !== "approved") {
          await User.updateOne({ _id: user._id }, { $inc: { phoneOtpAttempts: 1 } });
          return jsonFailed(res, {}, "Invalid or expired OTP", 400);
        }
      } else if (!bcrypt.compareSync(otp, user.phoneOtp)) {
        await User.updateOne({ _id: user._id }, { $inc: { phoneOtpAttempts: 1 } });
        return jsonFailed(res, {}, "Invalid or expired OTP", 400);
      }

      await User.updateOne(
        { _id: user._id },
        {
          $set: { isPhoneVerified: true, phoneVerifiedAt: new Date() },
          $unset: { phoneOtp: "", phoneOtpExpires: "", phoneOtpAttempts: "" },
        },
      );
      return jsonS(res, 200, "Phone number verified");
    } catch (error) {
      console.error("verifyPhoneOtp error:", error);
      return jsonFailed(res, {}, "Internal Server Error", 500);
    }
  },

  getToken: (user) => {
    var token = jwt.sign(
      { id: user._id, ...user.toJSON(), is_user: true, isGen: true },
      config.jwt_secret,
      {
        expiresIn: 3600, // expires in 1 hours
      },
    );
    var data = {
      email: user.email,
      phoneNumber: user.phoneNumber,
      isVerified: user.isVerified,
      is_user: true,
      token: token,
      token_type: "jwt",
      expiresIn: 3600,
      isGen: true
    };
    return data;
  },

  sendResetPasswordOtp: async (req, res) => {
    const { email } = req.body;

    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (user) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
        const otpExpires = Date.now() + 1800000;
        await User.updateOne({ _id: user._id }, { otp, otpExpires });
  
        const subject = "Reset Password Otp";
        const text = `Your otp is ${otp}. Kindly note that this will expire in 30 minutes. Cheers!`;
  
        SendEmail(
          user,
          subject,
          resendTemplate(user.firstName, text),
        );
      }


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

      await User.updateOne({ _id: user._id }, { otp: '', otpExpires: null })

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
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return jsonFailed(res, {}, "User not found.", 404);
      }

      if (user.otp) {
        return jsonFailed(
          res,
          {},
          "OTP not verified. You cannot reset your password.",
          403,
        );
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
