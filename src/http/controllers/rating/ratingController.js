const { jsonS, jsonFailed } = require("../../../utils");
const { listRatings, rateProduct, getRatingSummary, getRatingSummaries } = require("../../../services/ratingService");

const Controller = {
    listRatings: async (req, res) => {
        try {
        const { productId } = req.params;
        const ratings = await listRatings(productId);
        return jsonS(res, 200, 'Ratings fetched', ratings);
        } catch (err) {
            console.error(err);
            return jsonFailed(res, {}, err.message, 500);
        }
    },

    addRating: async (req, res) => {
        try {
            const { productId } = req.params;
            const { rating, review } = req.body;
            const rec = await rateProduct(req.user.id, productId, rating, review);
            return jsonS(res, 201, 'Rating saved', rec);
        } catch (err) {
            console.error(err);
            return jsonFailed(res, {}, err.message, 500);
        }
    },

    // this is not exactly needed again but I'm keeping it for now because I implemented this in the product metrics service
    ratingSummary: async (req, res) => {
        try {
            const { productId } = req.params;
            const summary = await getRatingSummary(productId);
            return jsonS(res, 200, 'Rating summary', summary);
        } catch (err) {
            console.error(err);
            return jsonFailed(res, {}, err.message, 500);
        }
    },

    batchRatingSummary: async (req, res) => {
        try {
            const raw = (req.query.product_ids || '').trim();
            const ids = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
            if (!ids.length) return jsonFailed(res, {}, 'product_ids is required', 400);
            const summaries = await getRatingSummaries(ids);
            return jsonS(res, 200, 'Rating summaries', summaries);
        } catch (err) {
            console.error(err);
            return jsonFailed(res, {}, err.message, 500);
        }
    },
};

module.exports = Controller;
