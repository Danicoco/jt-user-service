const { jsonS, jsonFailed } = require('../../../utils');
const cartService = require("../../../services/cartService");

const Controller = {
  async getCart(req, res) {
    try {
      const { cart, total } = await cartService.listCart(req.user.id);
      const data = cart.toObject({ virtuals: true });
      data.total = total;
      return jsonS(res, 200, 'Cart fetched', data);
    } catch (err) {
      console.error('getCart error:', err);
      return jsonFailed(res, {}, err.message, 500);
    }
  },

  async addItem(req, res) {
    try {
      const payload = Array.isArray(req.body.items)
        ? req.body.items
        : [req.body];

      const added = await cartService.addItemsToCart(req.user.id, payload);
      return jsonS(res, 201, 'Items added', added);
    } catch (err) {
      console.error('addItem error:', err);
      return jsonFailed(res, {}, err.message, 500);
    }
  },

  async updateItem(req, res) {
    try {
      const { id } = req.params;
      const { quantity } = req.body;
      const updated = await cartService.updateCartItem(req.user.id, id, { quantity });
      return jsonS(res, 200, 'Item updated', updated);
    } catch (err) {
      console.error('updateItem error:', err);
      return jsonFailed(res, {}, err.message, 500);
    }
  },

  async deleteItem(req, res) {
    try {
      const { id } = req.params;
      await cartService.removeCartItem(req.user.id, id);
      return jsonS(res, 200, 'Item removed', {});
    } catch (err) {
      console.error('deleteItem error:', err);
      return jsonFailed(res, {}, err.message, 500);
    }
  },

  async clearCart(req, res) {
    try {
      await cartService.clearCart(req.user.id);
      return jsonS(res, 200, 'Cart cleared', {});
    } catch (err) {
      console.error('clearCart error:', err);
      return jsonFailed(res, {}, err.message, 500);
    }
  },

  async reduceItem(req, res) {
    try {
      const { id } = req.params;
      // you can pass ?by=2 to reduce by 2, default is 1
      const decrement = parseInt(req.query.by, 10) || 1;
      const item = await cartService.reduceCartItem(req.user.id, id, decrement);
      return jsonS(res, 200, 'Item quantity reduced', item);
    } catch (err) {
      console.error('reduceItem error:', err);
      return jsonFailed(res, {}, err.message, 500);
    }
  },

  async getItemCount(req, res) {
  try {
    const totalItems = await cartService.getCartItemCount(req.user.id);
    return jsonS(res, 200, 'Total items fetched', { totalItems });
  } catch (err) {
    console.error('getItemCount error:', err);
    return jsonFailed(res, {}, err.message || 'Internal Server Error', 500);
  }
}
};

module.exports = Controller;
