const express = require("express");
const auth = require("../../middlewares/ambassadorAuth/authMiddleware");
const { RatingController } = require("../../http/controllers/rating");

const router = express.Router();

router.get('/ratings/:productId', auth, RatingController.listRatings);
router.get('/ratings/summary/:productId', RatingController.ratingSummary);
router.get('/ratings/summary', RatingController.batchRatingSummary);
router.post('/ratings/:productId',auth, RatingController.addRating);

module.exports = {
    baseUrl: "/user",
    router,
}