const Rating = require('../models/rating');

function toNumber(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : NaN;
}
function clampRating(n) {
  const v = toNumber(n);
  if (Number.isNaN(v)) return null;
  return Math.max(1, Math.min(5, Math.round(v)));
}

async function listRatings(productId) {
  return Rating.find({ productId }).sort({ created_at: -1 }).lean();
}

async function rateProduct(userId, productId, rating, review = '') {
  const r = clampRating(rating);
  if (!r) throw new Error('Rating must be between 1 and 5');
  return Rating.findOneAndUpdate(
    { userId, productId },
    { $set: { rating: r, review } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function getRatingSummary(productId) {
  const [row] = await Rating.aggregate([
    { $match: { productId } },
    {
      $group: {
        _id: '$productId',
        count: { $sum: 1 },
        avg: { $avg: '$rating' },
        r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        productId: '$_id',
        count: 1,
        average: { $round: ['$avg', 1] }, 
        histogram: { '1':'$r1','2':'$r2','3':'$r3','4':'$r4','5':'$r5' },
      },
    },
  ]);

  return row || {
    productId,
    count: 0,
    average: 0,
    histogram: { '1':0, '2':0, '3':0, '4':0, '5':0 },
  };
}

async function getRatingSummaries(productIds = []) {
  if (!Array.isArray(productIds) || productIds.length === 0) return [];
  const rows = await Rating.aggregate([
    { $match: { productId: { $in: productIds } } },
    {
      $group: {
        _id: '$productId',
        count: { $sum: 1 },
        avg: { $avg: '$rating' },
        r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        productId: '$_id',
        count: 1,
        average: { $round: ['$avg', 1] },
        histogram: { '1':'$r1','2':'$r2','3':'$r3','4':'$r4','5':'$r5' },
      },
    },
  ]);

  const map = new Map(rows.map(r => [r.productId, r]));
  return productIds.map(pid =>
    map.get(pid) || {
      productId: pid,
      count: 0,
      average: 0,
      histogram: { '1':0, '2':0, '3':0, '4':0, '5':0 },
    }
  );
}

module.exports = {
  listRatings,
  rateProduct,
  getRatingSummary,
  getRatingSummaries,
};
