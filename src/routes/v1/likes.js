const express = require("express");
const auth = require("../../middlewares/ambassadorAuth/authMiddleware");
const { LikesController } = require("../../http/controllers/likes");

const router = express.Router();

router.get('/likes', auth, LikesController.list);
router.post('/likes/:productId', auth, LikesController.like);
router.delete('/likes/:productId', auth, LikesController.unlike);

module.exports = {
    baseUrl: "/user",
    router,
}