const express = require("express");
const internalAuth = require("../../middlewares/ambassadorAuth/internalAuth");
const { AuthController, UserController } = require("../../http/controllers/user");
const { OrderController } = require("../../http/controllers/order");
const { InternalController } = require("../../http/controllers/internal");

const router = express.Router();

router.post(
  "/users/verify-pin",
  internalAuth,
  AuthController.verifyPin
);

router.get(
  "/users/count",
  internalAuth,
  UserController.userCount
);

router.post(
  "/users/batch",
  internalAuth,
  UserController.batchLookup
);

router.get(
  "/orders/latest", 
  internalAuth,
  OrderController.getLatesOrders
);

router.get(
  "/orders/metrics", 
  internalAuth,
  OrderController.getOrderMetrics
);

router.get(
  "/orders/top-products",
  internalAuth,
  OrderController.getTopProduct
);

router.get(
  "/customers", 
  internalAuth, 
  InternalController.listUsers
);

router.get(
  "/customers/metrics",
  internalAuth, 
  InternalController.usersMetrics
);

router.get(
  "/customers/:id/overview", 
  internalAuth, 
  InternalController.getUserOverview
);

router.get(
  "/orders/by-user", 
  internalAuth, 
  InternalController.listOrdersByUser
);

router.patch(
  "/users/:id/status", 
  internalAuth, 
  InternalController.updateUserStatus
);

router.get(
  "/orders/sales-data",
  internalAuth,
  InternalController.getSalesData,
)

router.get(
  "/orders/summary", 
  internalAuth, 
  InternalController.getOrdersSummary
);

router.get(
  "/orders/chart", 
  internalAuth, 
  InternalController.getOrdersChart
);

router.get(
  "/orders/admin-list", 
  internalAuth, 
  InternalController.listAllOrders
);

router.get(
  "/orders/:id",
  internalAuth,
  InternalController.getOrderById
);

router.get(
  "/addresses",
  internalAuth,
  InternalController.listUserAddress
);

router.post(
  "/addresses",
  internalAuth,
  InternalController.createAddress
);

router.patch(
  "/addresses/:id",
  internalAuth,
  InternalController.updateAddress
);

router.get(
  "/users/:id",
  internalAuth,
  UserController.getUserId
);


module.exports = {
  baseUrl: "/internal",
  router,
};
