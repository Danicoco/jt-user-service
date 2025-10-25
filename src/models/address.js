const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../utils/mongoDb');
const { Schema } = mongoose;

const AddressSchema = new Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  line1: {
    type: String,
    required: true,
    trim: true,
  },
  line2: {
    type: String,
    trim: true,
    default: null,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
    default: null,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  zipCode: {
    type: String,
    trim: true,
    default: null,
  },
  phone_number: {
    type: String,
    trim: true,
    default: null,
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: true,
  collection: 'addresses'
});

module.exports = db.model('Address', AddressSchema);
