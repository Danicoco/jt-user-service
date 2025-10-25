const express = require("express");
const { ProductController } = require("../../http/controllers/product");
const auth = require("../../middlewares/ambassadorAuth/authMiddleware");

const router = express.Router();

router.get("/", auth, ProductController.listProducts);
router.get("/:id", auth, ProductController.getProduct);
router.get("/:id/metrics", ProductController.getMerics);
router.get('/:id/share', auth, ProductController.shareProduct);

module.exports = {
    baseUrl: "/products",
    router,
}