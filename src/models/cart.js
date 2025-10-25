const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');
const { db } = require('../utils/mongoDb');

const CartSchema = new Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  userId: {
    type: String,
    ref: 'User',
    required: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

CartSchema.virtual('items', {
  ref: 'CartItem',
  localField: '_id',
  foreignField: 'cartId',
});

module.exports = db.model('Cart', CartSchema);