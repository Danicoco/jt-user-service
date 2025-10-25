const { jsonS, jsonFailed } = require("../../../utils");
const { User } = require("../../../models/user");
const Order = require("../../../models/order");
const Address = require("../../../models/address");

const PAID_STATUSES = ["pending", "confirmed", "in_transit", "completed"];
const COUNTED_STATUSES = ["completed", "confirmed"];

const baseUserMatch = { isDeleted: { $ne: true } };

function buildMonthBuckets(start, end) {
  const out = [];
  const c = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (c <= last) {
    out.push({ y: c.getFullYear(), m: c.getMonth() + 1 });
    c.setMonth(c.getMonth() + 1);
  }
  return out;
}

const buildOrderSearch = (q) => {
  if (!q) return {};
  const re = new RegExp(String(q).trim(), "i");
  return { $or: [{ checkoutRef: re }, { _id: re }] };
};

function buildUserSearch(search) {
  if (!search) return {};
  const re = new RegExp(String(search).trim(), "i");
  return {
    $or: [
      { firstName: re },
      { lastName: re },
      { email: re },
      { phoneNumber: re },
    ],
  };
}

const Controller = {
  listUsers: async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page || "1", 10), 1);
      const limit = Math.min(
        Math.max(parseInt(req.query.limit || "10", 10), 1),
        100
      );
      const skip = (page - 1) * limit;

      const { search, verified, active } = req.query;

      const match = { ...baseUserMatch };
      if (verified === "1") match.isVerified = true;
      if (verified === "0") match.isVerified = false;
      if (active === "1") match.isActive = true;
      if (active === "0") match.isActive = false;

      const searchClause = buildUserSearch(search);
      const finalMatch = Object.keys(searchClause).length
        ? { $and: [match, searchClause] }
        : match;

      const pipeline = [
        { $match: finalMatch },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "addresses",
            let: { uid: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              { $project: { city: 1, state: 1, country: 1 } },
            ],
            as: "addr",
          },
        },
        {
          $project: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            phoneNumber: 1,
            isVerified: 1,
            isActive: 1,
            createdAt: 1,
            location: {
              $let: {
                vars: {
                  a: { $arrayElemAt: ["$addr", 0] },
                },
                in: {
                  $let: {
                    vars: {
                      city: { $trim: { input: { $ifNull: ["$$a.city", ""] } } },
                      state: {
                        $trim: { input: { $ifNull: ["$$a.state", ""] } },
                      },
                    },
                    in: {
                      $switch: {
                        branches: [
                          {
                            case: {
                              $and: [
                                { $gt: [{ $strLenCP: "$$city" }, 0] },
                                { $gt: [{ $strLenCP: "$$state" }, 0] },
                              ],
                            },
                            then: { $concat: ["$$city", ", ", "$$state"] },
                          },
                          {
                            case: { $gt: [{ $strLenCP: "$$city" }, 0] },
                            then: "$$city",
                          },
                          {
                            case: { $gt: [{ $strLenCP: "$$state" }, 0] },
                            then: "$$state",
                          },
                        ],
                        default: null,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ];

      const [rows, total] = await Promise.all([
        User.aggregate(pipeline),
        User.countDocuments(finalMatch),
      ]);

      return jsonS(res, 200, "OK", {
        page,
        limit,
        total,
        customers: rows,
      });
    } catch (e) {
      console.error("customers.list error:", e);
      return jsonFailed(res, {}, "Error", 500);
    }
  },

  usersMetrics: async (req, res) => {
    try {
      const windowDays = Math.min(
        parseInt(req.query.windowDays || "30", 10),
        365
      );
      const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

      const [totalCustomers, newCustomersInWindow, orderedUserIds] =
        await Promise.all([
          User.countDocuments(baseUserMatch),
          User.countDocuments({ ...baseUserMatch, createdAt: { $gte: since } }),
          Order.distinct("userId", {}),
        ]);

      const returningCustomers = orderedUserIds.length;
      const conversionRate =
        totalCustomers > 0
          ? Math.round((returningCustomers / totalCustomers) * 100)
          : 0;

      // Chart series (last 12 months): new customers vs active customers (placed order)
      const start = new Date();
      start.setMonth(start.getMonth() - 11, 1);
      start.setHours(0, 0, 0, 0);

      // New customers / month
      const newSeries = await User.aggregate([
        { $match: { ...baseUserMatch, createdAt: { $gte: start } } },
        {
          $group: {
            _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]);

      // Active customers / month (users with orders in that month)
      const activeSeries = await Order.aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: {
              y: { $year: "$createdAt" },
              m: { $month: "$createdAt" },
              u: "$userId",
            },
            one: { $first: 1 },
          },
        },
        {
          $group: {
            _id: { y: "$_id.y", m: "$_id.m" },
            count: { $sum: 1 },
          },
        },
      ]);

      // Normalize into 12 points
      const monthKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}`;
      const mapCounts = (arr) => {
        const m = new Map();
        for (const r of arr) m.set(`${r._id.y}-${r._id.m}`, r.count);
        return m;
      };
      const newMap = mapCounts(newSeries);
      const actMap = mapCounts(activeSeries);

      const series = [];
      const cursor = new Date(start);
      for (let i = 0; i < 12; i++) {
        const key = monthKey(cursor);
        series.push({
          year: cursor.getFullYear(),
          month: cursor.getMonth() + 1,
          label: cursor.toLocaleString("en", { month: "short" }),
          newCustomers: newMap.get(key) || 0,
          returningCustomers: actMap.get(key) || 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      return jsonS(res, 200, "OK", {
        cards: {
          totalCustomers,
          newCustomers: newCustomersInWindow,
          returningCustomers,
          conversionRate, // %
        },
        series, // 12 months
      });
    } catch (e) {
      console.error("customers.metrics error:", e);
      return jsonFailed(res, {}, "Error", 500);
    }
  },

  getUserOverview: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findOne({ _id: id, ...baseUserMatch })
        .select(
          "_id firstName lastName email phoneNumber isVerified isActive createdAt imageUrl"
        )
        .lean();

      if (!user) return jsonFailed(res, {}, "Not found", 404);

      const addr = await Address.findOne({ userId: id })
        .sort({ isDefault: -1, createdAt: -1 })
        .select("city state country")
        .lean();

      const ordersCount = await Order.countDocuments({ userId: id });

      const location = addr
        ? [addr.city, addr.state].filter(Boolean).join(", ") ||
          addr.country ||
          null
        : null;

      return jsonS(res, 200, "OK", {
        profile: user,
        location,
        ordersCount,
      });
    } catch (e) {
      console.error("customers.overview error:", e);
      return jsonFailed(res, {}, "Error", 500);
    }
  },

  listOrdersByUser: async (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) return jsonFailed(res, {}, "userId is required", 400);

      const page = Math.max(parseInt(req.query.page || "1", 10), 1);
      const limit = Math.min(
        Math.max(parseInt(req.query.limit || "10", 10), 1),
        100
      );
      const skip = (page - 1) * limit;

      const q = { userId };
      if (req.query.status) q.status = req.query.status;

      const [rows, total] = await Promise.all([
        Order.find(q)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select("_id status total items createdAt trackingId")
          .lean(),
        Order.countDocuments(q),
      ]);

      return jsonS(res, 200, "OK", { page, limit, total, orders: rows });
    } catch (e) {
      console.error("orders.byUser error:", e);
      return jsonFailed(res, {}, "Error", 500);
    }
  },

  updateUserStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return jsonFailed(res, {}, "isActive (boolean) is required", 400);
      }

      const updated = await User.findOneAndUpdate(
        { _id: id, ...baseUserMatch },
        { $set: { isActive } },
        { new: true }
      ).select("_id isActive");

      if (!updated) return jsonFailed(res, {}, "Not found", 404);
      return jsonS(res, 200, "OK", updated);
    } catch (e) {
      console.error("users.updateStatus error:", e);
      return jsonFailed(res, {}, "Error", 500);
    }
  },

  getSalesData: async (req, res) => {
    try {
      const months = Math.min(parseInt(req.query.months || "6", 10), 24);
      const now = new Date();
      const start = new Date(
        now.getFullYear(),
        now.getMonth() - (months - 1),
        1
      );
      const end = new Date(now.getFullYear(), now.getMonth(), 1);

      const seriesAgg = await Order.aggregate([
        {
          $match: {
            status: { $in: PAID_STATUSES },
            createdAt: { $gte: start, $lte: new Date() },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
            units: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.subtotal" },
            orders: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            _id: 0,
            y: "$_id.y",
            m: "$_id.m",
            units: 1,
            revenue: 1,
            orders: { $size: "$orders" },
          },
        },
        { $sort: { y: 1, m: 1 } },
      ]);

      const map = new Map(seriesAgg.map((r) => [`${r.y}-${r.m}`, r]));
      const buckets = buildMonthBuckets(start, end);

      const data = buckets.map((b) => {
        const k = `${b.y}-${b.m}`;
        const r = map.get(k) || { units: 0, revenue: 0, orders: 0 };
        const label = new Date(b.y, b.m - 1, 1).toLocaleString("en", {
          month: "short",
        });
        return {
          year: b.y,
          month: b.m,
          label,
          units: r.units,
          revenue: r.revenue,
          orders: r.orders,
        };
      });

      // simple MoM % change on units (last vs previous)
      const n = data.length;
      const prev = n >= 2 ? data[n - 2].units : 0;
      const curr = n >= 1 ? data[n - 1].units : 0;
      const momUnitsPct =
        prev === 0
          ? curr > 0
            ? 100
            : 0
          : Math.round(((curr - prev) / prev) * 100);

      return res
        .status(200)
        .json({
          status: "success",
          message: "OK",
          data: { data, momUnitsPct },
        });
    } catch (e) {
      console.error("orders.sales-series error:", e);
      return res
        .status(500)
        .json({ status: "error", message: "Error", data: {} });
    }
  },

  getOrdersSummary: async (req, res) => {
    try {
      const [totalOrders, completedOrders, grossAgg] = await Promise.all([
        Order.countDocuments({}),
        Order.countDocuments({ status: { $in: COUNTED_STATUSES } }),
        Order.aggregate([
          { $match: { status: { $in: COUNTED_STATUSES } } },
          { $group: { _id: null, gross: { $sum: "$total" } } },
        ]),
      ]);

      const gmvGross = Number(grossAgg?.[0]?.gross || 0);
      const gmvNet = gmvGross; // adjust if you later subtract refunds/fees

      return jsonS(res, 200, "OK", {
        totalOrders,
        completedOrders,
        gmvGross,
        gmvNet,
      });
    } catch (e) {
      console.error("orders.summary error:", e);
      return jsonFailed(res, {}, "Error", 500);
    }
  },

  getOrdersChart: async (req, res) => {
    try {
      const months = Math.min(parseInt(req.query.months || "6", 10), 24);
      const start = new Date();
      start.setMonth(start.getMonth() - (months - 1), 1);
      start.setHours(0, 0, 0, 0);

      const rows = await Order.aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
            totalOrders: { $sum: 1 },
            completedOrders: {
              $sum: { $cond: [{ $in: ["$status", COUNTED_STATUSES] }, 1, 0] },
            },
            gmv: {
              $sum: {
                $cond: [{ $in: ["$status", COUNTED_STATUSES] }, "$total", 0],
              },
            },
          },
        },
      ]);

      const map = new Map(rows.map((r) => [`${r._id.y}-${r._id.m}`, r]));
      const series = [];
      const cursor = new Date(start);
      for (let i = 0; i < months; i++) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth() + 1}`;
        const r = map.get(key);
        series.push({
          year: cursor.getFullYear(),
          month: cursor.getMonth() + 1,
          label: cursor.toLocaleString("en", { month: "short" }),
          totalOrders: r?.totalOrders || 0,
          completedOrders: r?.completedOrders || 0,
          gmv: r?.gmv || 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      return jsonS(res, 200, "OK", { series });
    } catch (e) {
      console.error("orders.chart error:", e);
      return jsonFailed(res, {}, "Error", 500);
    }
  },

  listAllOrders: async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page || "1", 10), 1);
      const limit = Math.min(
        Math.max(parseInt(req.query.limit || "10", 10), 1),
        100
      );
      const skip = (page - 1) * limit;

      const { status, q, from, to } = req.query;

      const match = {};
      if (status) match.status = status;
      if (from || to) {
        match.createdAt = {};
        if (from) match.createdAt.$gte = new Date(from);
        if (to) match.createdAt.$lte = new Date(to);
      }

      const search = buildOrderSearch(q);
      const finalMatch = Object.keys(search).length
        ? { $and: [match, search] }
        : match;

      const [rows, total] = await Promise.all([
        Order.find(finalMatch)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select("_id userId status total createdAt items checkoutRef")
          .populate("userId")
          .lean(),
        Order.countDocuments(finalMatch),
      ]);

      const orders = rows.map((o) => ({
        id: String(o._id),
        checkoutRef: o.checkoutRef,
        userId: o.userId,
        status: o.status,
        total: o.total,
        createdAt: o.createdAt,
        itemsCount: Array.isArray(o.items) ? o.items.length : 0,
      }));

      return jsonS(res, 200, "OK", { page, limit, total, orders });
    } catch (e) {
      console.error("internal orders.admin-list error:", e);
      return jsonFailed(res, {}, "Error", 500);
    }
  },

  getOrderById: async (req, res) => {
    try {
      const order = await Order.findById(req.params.id).lean();
      if (!order) return jsonFailed(res, {}, "Order not found", 404);
      return jsonS(res, 200, "OK", order);
    } catch (e) {
      console.error("internal getOrderById error:", e);
      return jsonFailed(res, {}, "Error", 500);
    }
  },
  listUserAddress: async (req, res) => {
    try {
      const { id, city } = req.query;
      const filter = {
        ...(id && { id }),
        ...(city && { city }),
      };
      const rows = await Address.find(filter)
        .sort({ isDefault: -1, createdAt: -1 })
        .lean();
      return jsonS(res, 200, "OK", rows);
    } catch (e) {
      console.error("internal listAddressesForUser error:", e);
      return jsonFailed(res, {}, "Error", 500);
    }
  },
  createAddress: async (req, res) => {
    try {
      const data = await Address.create([req.body]);
      
      return jsonS(res, 200, "OK", data);
    } catch (e) {
      console.error("internal create AddressesForUser error:", e);
      return jsonFailed(res, {}, "Error", 500);
    }
  },
  updateAddress: async (req, res) => {
    try {
      const { id } = req.params;
      const address = await Address.findOne({ id });
      if (!address) return jsonFailed(res, {}, "Address not found", 404);
      const data = await Address.updateOne({ _id: address.id }, { ...req.body });
      
      return jsonS(res, 200, "OK", data);
    } catch (e) {
      console.error("internal update AddressesForUser error:", e);
      return jsonFailed(res, {}, "Error", 500);
    }
  },
};

module.exports = Controller;
