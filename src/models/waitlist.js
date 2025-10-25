const mongoose = require("mongoose");
const { db } = require("../utils/mongoDb");
const { Schema } = mongoose;
const WaitlistSchema = new Schema({
  _id: {
    type: String,
    required: true,
  },
  rank: {
    type: Number,
    required: false
  },
  email: {
    type: String,
    required: false
  },
  phoneNumber: {
    type: String,
    required: false
  },
  referralCode: {
    type: String 
  },
  referralId: {
    type: String,
    required: false
  },
  token: {
    type: String,
    required: false
  },
  firstName: {
    type: String,
    required: false
  },
  lastName: {
    type: String,
    required: false
  },
  imageUrl: {
    type: String,
    required: false
  },
  password: {
    type: String,
    required: false,
    select: false
  },
  points: {
    type: Number,
    default: 0,  // Initialize points to 0 by default
  },
  isVerified: {
    type: Boolean,
    required: false,
    default: 0
  },
  isActive: {
    type: Boolean,
    required: false,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    required: false,
    default: 0
  },
  acceptedTerms: {
    type: Boolean,
    required: true,
    default: 1
  },
},
{
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
},
{
  timestamps: true
});

const Waitlist = db.model("Waitlist", WaitlistSchema);

module.exports = {
  Waitlist
};