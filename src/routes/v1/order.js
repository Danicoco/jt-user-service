const express = require("express");
const { OrderController } = require("../../http/controllers/order");
const auth = require("../../middlewares/ambassadorAuth/authMiddleware");

const router = express.Router();

router.get("/orders", auth, OrderController.listOrders);
router.get("/orders/:id", auth, OrderController.getOrders);

module.exports = {
    baseUrl: "/user",
    router,
}