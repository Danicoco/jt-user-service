const express = require("express");
const { UserController } = require("../../http/controllers/user");
const auth = require("../../middlewares/ambassadorAuth/authMiddleware");

const router = express.Router();

router.get("/profile", auth, UserController.getProfile);
router.get("/search", auth, UserController.searchUser);
router.post("/fcm-token", auth, UserController.updateFcmToken);
router.post("/fcm-token/remove", auth, UserController.removeFcmToken);
router.patch("/delivery-address", auth, UserController.updateUserDelivery);
router.patch("/notification", auth, UserController.updateNotificationSettings);
// router.get("/notifications", auth, UserController.getUserNotifications);

module.exports = {
    baseUrl: "/user",
    router,
  };