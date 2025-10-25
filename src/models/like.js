const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');
const { db } = require('../utils/mongoDb');

const LikeSchema = new Schema({
  _id:        { type: String, default: () => uuidv4() },
  userId:     { type: String, ref: 'User', required: true, index: true },
  productId:  { type: String, ref: 'Product', required: true },
  isLiked:    { type: Boolean, default: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

LikeSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = db.model('Like', LikeSchema);
