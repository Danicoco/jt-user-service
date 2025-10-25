const express = require("express");
const auth = require("../../middlewares/ambassadorAuth/authMiddleware");
const { WishlistController } = require("../../http/controllers/wishlist");

const router = express.Router();

router.get('/wishlist', auth, WishlistController.list);
router.post('/wishlist', auth, WishlistController.add);
router.delete('/wishlist/:productId', auth, WishlistController.remove);

module.exports = {
    baseUrl: "/user",
    router,
}