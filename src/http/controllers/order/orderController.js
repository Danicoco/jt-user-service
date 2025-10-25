const { jsonS, jsonFailed } = require("../../../utils");
const { listOrders, getOrder } = require("../../../services/orderService");
const Order = require("../../../models/order");

const COUNTED_STATUSES = ['completed', 'confirmed'];

const Controller = {
    listOrders: async (req, res) => {
         try {
            const orders = await listOrders(req.user.id);
            return jsonS(res, 200, "Orders fetched", orders);
        } catch (err) {
            console.error("Error listing order:", err);
            return jsonFailed(res, {}, "Internal Server Error", 500);
        }
    },

    getOrders: async (req, res) => {
        try {
            const order = await getOrder(req.user.id, req.params.id);
            if (!order) return jsonFailed(res, {}, "Order not found", 404);
            return jsonS(res, 200, 'Order fetched', order);
        } catch (err) {
            console.error("Error getting orders:", err);
            return jsonFailed(res, {}, "Internal Server Error", 500);
        }
    },

    getOrderMetrics: async (req, res) => {
        try {
            const totalOrders = await Order.countDocuments({});
            const [agg] = await Order.aggregate([
                { $match: { status: { $in: COUNTED_STATUSES } } },
                { $unwind: '$items' },
                {
                $group: {
                    _id: null,
                    productSold: { $sum: '$items.quantity' },
                    nairaVolume: { $sum: '$total' } // GMV from completed orders
                }
            }
        ]);

            return jsonS(res, 200, 'OK', {
                totalOrders,
                productSold: agg?.productSold || 0,
                nairaVolume: agg?.nairaVolume || 0
            });
        } catch (e) {
            console.error('orders.metrics error:', e);
            return jsonFailed(res, {}, 'Error', 500);
        }
    },
    getLatesOrders: async (req, res) => {
        try {
            const limit = Math.min(Number(req.query.limit) || 6, 50);
            const orders = await Order.find({})
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate("userId")
                .lean();
            return jsonS(res, 200, 'OK', orders);
        } catch (e) {
            console.error('orders.latest error:', e);
            return jsonFailed(res, {}, 'Error', 500);
        }
    },

    getTopProduct: async (req, res) => {
        try {
            const limit = Math.min(Number(req.query.limit) || 3, 50);
            const top = await Order.aggregate([
                { $match: { status: { $in: COUNTED_STATUSES } } },
                { $unwind: '$items' },
                {
                $group: {
                    _id: '$items.productId',
                    sold: { $sum: '$items.quantity' },
                    revenue: { $sum: '$items.subtotal' }
                }
                },
                { $sort: { sold: -1 } },
                { $limit: limit }
            ]);
            return jsonS(res, 200, 'OK', top);
        } catch (e) {
            console.error('orders.topProducts error:', e);
            return jsonFailed(res, {}, 'Error', 500);
        }
    },
};

module.exports = Controller;