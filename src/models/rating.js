const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');
const { db } = require('../utils/mongoDb');

const RatingSchema = new Schema({
  _id:        { type: String, default: () => uuidv4() },
  userId:     { type: String, ref: 'User', required: true, index: true },
  productId:  { type: String, ref: 'Product', required: true, index: true },
  rating:     { type: Number, required: true, min: 1, max: 5 },
  review:     { type: String, default: '' },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// one rating per user/product
RatingSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = db.model('Rating', RatingSchema);
