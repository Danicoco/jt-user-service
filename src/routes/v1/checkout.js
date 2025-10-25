const express = require("express");
const { CheckoutController } = require("../../http/controllers/checkout");
const auth = require("../../middlewares/ambassadorAuth/authMiddleware");

const router = express.Router();

router.post('/cart/checkout', auth, CheckoutController.checkout);

module.exports = {
    baseUrl: "/user",
    router,
}