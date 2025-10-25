const express = require("express");
const auth = require("../../middlewares/ambassadorAuth/authMiddleware");
const { RateController } = require("../../http/controllers/rates");

const router = express.Router();

router.get("/rates/shipping", auth, RateController.getShippingRates);
router.get("/rates/shipping/categories", auth, RateController.getShippingCategories);
router.get("/rates/shipping/products",   auth, RateController.getShippingProducts);

module.exports = {
    baseUrl: "/user",
    router,
}