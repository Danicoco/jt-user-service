const Like = require('../models/like');

async function listLikes(userId) {
  return Like.find({ userId, isLiked: true });
}

async function likeProduct(userId, productId) {
  const record = await Like.findOneAndUpdate(
    { userId, productId },
    { isLiked: true },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
  return record;
}

async function unlikeProduct(userId, productId) {
  return Like.findOneAndUpdate(
    { userId, productId },
    { isLiked: false },
    { new: true }
  );
}

module.exports = {
  listLikes,
  likeProduct,
  unlikeProduct,
};
