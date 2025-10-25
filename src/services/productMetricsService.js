const Rating = require('../models/rating');   
const Order  = require('../models/order');    

const SOLD_STATUSES = ['confirmed']; 

function parseDate(v, endOfDay = false) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23,59,59,999);
  return d;
}

function soldPipelineBase({ from, to }) {
  const match = { status: { $in: SOLD_STATUSES } };
  const fromDate = parseDate(from, false);
  const toDate   = parseDate(to, true);
  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = fromDate;
    if (toDate)   match.createdAt.$lte = toDate;
  }
  return [
    { $match: match },
    { $unwind: '$items' },
  ];
}

async function getRatingBlock(productId) {
  const [row] = await Rating.aggregate([
    { $match: { productId } },
    {
      $group: {
        _id: '$productId',
        count: { $sum: 1 },
        avg:   { $avg: '$rating' }
      }
    },
    { $project: { _id: 0, count: 1, average: { $round: ['$avg', 1] } } }
  ]);
  return row || { count: 0, average: 0 };
}

async function getSalesBlock(productId, range) {
  const pipeline = [
    ...soldPipelineBase(range),
    { $match: { 'items.productId': productId } },
    {
      $group: {
        _id: null,
        qty: { $sum: { $ifNull: ['$items.quantity', 0] } },
        revenue: {
          $sum: {
            $ifNull: [
              '$items.subtotal',
              { $multiply: [ { $ifNull: ['$items.quantity', 0] }, { $ifNull: ['$items.unitPrice', 0] } ] }
            ]
          }
        }
      }
    },
    { $project: { _id: 0, qty: 1, revenue: 1 } }
  ];
  const [row] = await Order.aggregate(pipeline);
  return row || { qty: 0, revenue: 0 };
}

async function getProductMetrics(productId, { from, to } = {}) {
  const [rating, sales] = await Promise.all([
    getRatingBlock(productId),
    getSalesBlock(productId, { from, to }),
  ]);

  return {
    productId,
    rating: { average: rating.average, count: rating.count },
    sales:  { totalSold: sales.qty, revenue: sales.revenue },
    data: {
      average_rating: `${rating.average}`,
      totat_sold:   `${sales.qty}`
    }
  };
}

async function getProductsMetrics(productIds, { from, to } = {}) {
  const ratingRows = await Rating.aggregate([
    { $match: { productId: { $in: productIds } } },
    { $group: { _id: '$productId', count: { $sum: 1 }, avg: { $avg: '$rating' } } },
    { $project: { _id: 0, productId: '$_id', count: 1, average: { $round: ['$avg', 1] } } }
  ]);

  const salesRows = await Order.aggregate([
    ...soldPipelineBase({ from, to }),
    { $match: { 'items.productId': { $in: productIds } } },
    {
      $group: {
        _id: '$items.productId',
        qty: { $sum: { $ifNull: ['$items.quantity', 0] } },
        revenue: {
          $sum: {
            $ifNull: [
              '$items.subtotal',
              { $multiply: [ { $ifNull: ['$items.quantity', 0] }, { $ifNull: ['$items.unitPrice', 0] } ] }
            ]
          }
        }
      }
    },
    { $project: { _id: 0, productId: '$_id', qty: 1, revenue: 1 } }
  ]);

  const ratingsMap = new Map(ratingRows.map(r => [r.productId, r]));
  const salesMap   = new Map(salesRows.map(s => [s.productId, s]));

  return productIds.map(id => {
    const r = ratingsMap.get(id) || { average: 0, count: 0 };
    const s = salesMap.get(id)   || { qty: 0, revenue: 0 };
    return {
      productId: id,
      rating: { average: r.average || 0, count: r.count || 0 },
      sales:  { totalSold: s.qty || 0, revenue: s.revenue || 0 },
      ui:     { ratingText: `${r.average || 0}`, soldText: `${s.qty || 0}` }
    };
  });
}

module.exports = { getProductMetrics, getProductsMetrics };
