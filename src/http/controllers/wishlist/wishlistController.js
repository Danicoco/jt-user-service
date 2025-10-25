const { jsonS, jsonFailed } = require("../../../utils");
const { listWishlist, addToWishlist, removeFromWishlist } = require("../../../services/wishlistService");
const { getProduct } = require("../../../services/adminProductService");

const Controller = {
    list: async (req, res) => {
        try {
            const items = await listWishlist(req.user.id);
            const products = await Promise.all(
                items.map(i => getProduct(i.productId))
            );
            return jsonS(res, 200, 'Wishlist fetched', products);
        } catch (err) {
            console.error(err);
            return jsonFailed(res, {}, err.message, 500);
        }
    },

    add: async (req, res) => {
        try {
            const { productId } = req.body;
            if (!productId) return jsonFailed(res, {}, 'productId required', 400);
            await addToWishlist(req.user.id, productId);
            return jsonS(res, 201, 'Added to wishlist', {});
        } catch (err) {
            console.error(err);
            return jsonFailed(res, {}, err.message, 500);
        }
    },

    remove: async (req, res) => {
        try {
            const { productId } = req.params;
            await removeFromWishlist(req.user.id, productId);
            return jsonS(res, 200, 'Removed from wishlist', {});
        } catch (err) {
            console.error(err);
            return jsonFailed(res, {}, err.message, 500);
        }
    },

};

module.exports = Controller;