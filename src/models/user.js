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

    isVerified: { type: Boolean, default: 0 },
    isActive: { type: Boolean, default: 0 },
    isDeleted: { type: Boolean, default: 0 },

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

const User = db.model("User", UserSchema);

module.exports = { User };
