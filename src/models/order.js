const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');
const { db } = require('../utils/mongoDb');

const OrderSchema = new Schema({
  _id:       { type: String, default: () => uuidv4() },
  userId:    { type: String, ref: 'User', required: true, index: true },
  items: [{
    productId: String,
    quantity:  Number,
    unitPrice: Number,
    subtotal:  Number,
  }],
  total:     { type: Number, required: true },
  status:    {
    type: String,
    enum: ['pending','confirmed','in_transit','completed','cancelled'],
    default: 'pending',
    index: true
  },
  checkoutRef: { type: String, required: true, unique: true, index: true },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

module.exports = db.model('Order', OrderSchema);
