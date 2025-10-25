const express = require("express");
const auth = require("../../middlewares/ambassadorAuth/authMiddleware");
const { CartController } = require("../../http/controllers/cart");

const router = express.Router();

router.get('/cart', auth, CartController.getCart);
router.post('/cart/items', auth, CartController.addItem);
router.patch('/cart/items/:id', auth, CartController.updateItem);
router.delete('/cart/items/:id', auth, CartController.deleteItem);
router.delete('/cart', auth, CartController.clearCart);
router.patch('/cart/items/:id/reduce', auth, CartController.reduceItem);
router.get('/cart/total', auth, CartController.getItemCount);


module.exports = {
    baseUrl: "/user",
    router,
}