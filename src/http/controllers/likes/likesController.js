const { jsonS, jsonFailed } = require("../../../utils");
const { listLikes, likeProduct, unlikeProduct } = require("../../../services/likeService");
const { getProduct } = require("../../../services/adminProductService");

const Controller = {
    list: async (req, res) => {
        try {
            const likes = await listLikes(req.user.id);
            const products = await Promise.all(
                likes.map(l => getProduct(l.productId))
            );
            return jsonS(res, 200, 'Liked products fetched', products);
        } catch (err) {
            console.error(err);
            return jsonFailed(res, {}, err.message, 500);
        }
    },

    like: async (req, res) => {
        try {
            const { productId } = req.params;
            await likeProduct(req.user.id, productId);
            return jsonS(res, 201, 'Product liked', {});
        } catch (err) {
            console.error(err);
            return jsonFailed(res, {}, err.message, 500);
        }
    },

    unlike: async (req, res) => {
        try {
            const { productId } = req.params;
            await unlikeProduct(req.user.id, productId);
            return jsonS(res, 200, 'Product unliked', {});
        } catch (err) {
            console.error(err);
            return jsonFailed(res, {}, err.message, 500);
        }
    }
};

module.exports = Controller;