const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');
const { db } = require('../utils/mongoDb');

const CartItemSchema = new Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  cartId: {
    type: String,
    ref: 'Cart',
    required: true,
    index: true,
  },
  productId: {
    type: String,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  price: {
    type: Schema.Types.Decimal128,
    required: true,
    min: 0,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = db.model('CartItem', CartItemSchema);