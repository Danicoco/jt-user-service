const express = require("express");
const auth = require("../../middlewares/ambassadorAuth/authMiddleware");
const { ShippingController } = require("../../http/controllers/shipping");
const { cloudConfig, uploadField } = require("../../services/cloudinaryService");

const router = express.Router();

router.post("/shipping", auth, ShippingController.create);
router.post("/shipping/drop-off", auth, cloudConfig, uploadField('file', 'drop-off'), ShippingController.createDrop);
router.get("/shipping/drop-off", auth, ShippingController.listAllDropOff);
router.get("/shipping", auth, ShippingController.list);
router.get("/shipping/:id", auth, ShippingController.get);
router.post('/shipments/:id/pay', auth, ShippingController.payFromWallet);
router.post('/shipments/drop-off/:id/pay', auth, ShippingController.payForDropOff);

module.exports = {
    baseUrl: "/user",
    router,
}