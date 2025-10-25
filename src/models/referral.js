const mongoose = require("mongoose");
const { db } = require("../utils/mongoDb");
const { Schema } = mongoose;

const referralSchema = new Schema({
  userId: {
    type: String,
    required: true,
    unique: true,          
    index: true,
  },
  referralCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,       
    trim: true,
    index: true,
  },
  referredUsers: [{
    type: String,          
  }],
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

referralSchema.virtual('referralsCount').get(function () {
  return Array.isArray(this.referredUsers) ? this.referredUsers.length : 0;
});

module.exports = db.model("Referral", referralSchema);
