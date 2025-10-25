const WishlistItem = require("../models/wishlist");

async function listWishlist(userId) {
  return WishlistItem.find({ userId });
}

async function addToWishlist(userId, productId) {
  return WishlistItem.create({ userId, productId });
}

async function removeFromWishlist(userId, productId) {
  await WishlistItem.deleteOne({ userId, productId });
}

module.exports = { listWishlist, addToWishlist, removeFromWishlist };
