const mongoose = require("mongoose");
const { db } = require("../utils/mongoDb");
const { Schema } = mongoose;

const DeliverySchema = new Schema(
  {
    phoneNumber: { type: String, required: true },
    address: { type: String, required: true },
    country: { type: String, required: true },
    zipCode: { type: String },
    city: { type: String },
    state: { type: String },
    note: { type: String },
  },
  { _id: false }
);

const NotificationSchema = new Schema(
  {
    pushNotification: { type: Boolean, default: false },
    offers: { type: Boolean, default: false },
    reward: { type: Boolean, default: false },
  },
  { _id: false }
);

const FcmDeviceSchema = new Schema(
  {
    token: { type: String, required: true },
    platform: { type: String, enum: ["android", "ios", "web", "unknown"], default: "unknown" },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const RiskOverrideSchema = new Schema(
  {
    level: { type: String, enum: ["low", "medium", "high"], required: true },
    note: { type: String },
    setBy: { type: String },
    setAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WatchlistFlagSchema = new Schema(
  {
    flagged: { type: Boolean, default: true },
    entryId: { type: String },
    bvnLast4: { type: String },
    reason: { type: String },
    flaggedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DuplicateBvnFlagSchema = new Schema(
  {
    flagged: { type: Boolean, default: true },
    keptUserId: { type: String }, // the account that kept the BVN
    bvnLast4: { type: String },
    flaggedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    _id: { type: String, required: true },

    email: { type: String, required: false, lowercase: true, trim: true },
    phoneNumber: { type: String, required: false, trim: true },

    token: { type: String, required: false },
    otp: { type: String, required: false },
    otpExpires: { type: String, required: false },

    fullName: { type: String, required: false },

    firstName: { type: String, required: false, trim: true },
    lastName: { type: String, required: false, trim: true },

    imageUrl: { type: String, required: false },

    isVerified: { type: Boolean, default: false },

    // SMS number verification (separate from the email OTP above)
    isPhoneVerified: { type: Boolean, default: false },
    phoneVerifiedAt: { type: Date, required: false },
    phoneOtp: { type: String, select: false },
    phoneOtpExpires: { type: Date, select: false },
    phoneOtpAttempts: { type: Number, default: 0, select: false },
    phoneOtpSentAt: { type: Date, select: false },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    receiveMail: { type: Boolean, default: 1 },
    acceptedTerms: { type: Boolean, required: true, default: 1 },

    password: { type: String, select: false },
    pin: { type: String, select: false },

    gender: { type: String, required: true },

    role: {
      type: String,
      enum: [
        "Administrator",
        "Manager",
        "Product Manager",
        "Customer Support",
        "User",
      ],
      default: "User",
      required: true,
    },

    fcmTokens: { type: [String], default: [] },
    // platform per token, so admin pushes can target android / ios
    fcmDevices: { type: [FcmDeviceSchema], default: [] },

    // manual risk level set by an admin; overrides the computed level when present
    riskOverride: { type: RiskOverrideSchema, default: undefined },

    // set when the user's BVN matches the admin BVN watchlist; the account is
    // deactivated at the same time
    watchlistFlag: { type: WatchlistFlagSchema, default: undefined },

    // set when this account's BVN is also on another account and this one was
    // deactivated; it stays after an admin reactivates the account, so the
    // duplicate check doesn't deactivate it again
    duplicateBvnFlag: { type: DuplicateBvnFlagSchema, default: undefined },

    level: {
      type: String,
      enum: ["Starter", "Big Boss", "Midas"],
      default: "Starter",
    },

    totalTransacted: { type: Number, default: 0 },

    referredBy: { type: String, ref: "User", default: null },
    deliveryAddress: { type: DeliverySchema },

    notification: NotificationSchema
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

UserSchema.virtual("displayName").get(function () {
  if (this.firstName || this.lastName)
    return `${this.firstName || ""} ${this.lastName || ""}`.trim();
  return this.fullName || "";
});

UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });
// referral lists and the wallet service's referral reward sync
UserSchema.index({ referredBy: 1, createdAt: -1 }, { sparse: true });

const User = db.model("User", UserSchema);

module.exports = { User };
