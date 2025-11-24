const { User } = require("../../../models/user");
const { jsonS, jsonFailed } = require("../../../utils");
const bcrypt = require("bcryptjs");
const { searchUsers } = require("../../../services/userService");
// const Notification = require("../../../models/notification"); // would come back to this when notification service is availble

const Controller = {
    getProfile: async(req, res) =>{
        const { id } = req.user;
        try {
          const profile = await User.findOne({_id: id });
          return jsonS(res, 200, "success", profile, {});
        } catch (error) {
          console.error(error);
          return jsonFailed(res, null, "Internal Server Error", 500);
        }
    },

    searchUser: async (req, res) => {
        const raw = req.query.query;
        if (!raw) {
            return jsonFailed(res, {}, "Search query is required", 400);
        }

        try {
            const results = await searchUsers(raw);

            if (results.length === 0) {
                return jsonFailed(res, {}, "No users found matching your query", 404);
            }

            return jsonS(res, 200, "Users found", results);
        } catch (err) {
            console.error("Error searching users:", err);
            return jsonFailed(res, {}, "Internal server error", 500);
        }
    },

    updateFcmToken: async (req, res) => {
        const { id } = req.user;
        const { fcmToken } = req.body;
      
        if (!fcmToken) {
          return jsonFailed(res, {}, "FCM token is required", 400);
        }
      
        try {
          const user = await User.findById(id);
          if (!user) {
            return jsonFailed(res, {}, "User not found", 404);
          }
      
          // Avoid duplicates
          if (!user.fcmTokens.includes(fcmToken)) {
            user.fcmTokens.push(fcmToken);
            await user.save();
          }
      
          return jsonS(res, 200, "FCM token updated successfully");
        } catch (error) {
          console.error("Error updating FCM token:", error);
          return jsonFailed(res, {}, "Internal Server Error", 500);
        }
    },

    removeFcmToken: async (req, res) => {
        const { id } = req.user;
        const { fcmToken } = req.body;
      
        if (!fcmToken) {
          return jsonFailed(res, {}, "FCM token is required", 400);
        }
      
        try {
          const user = await User.findById(id);
          if (!user) {
            return jsonFailed(res, {}, "User not found", 404);
          }
      
          const updatedTokens = user.fcmTokens.filter(token => token !== fcmToken);
          user.fcmTokens = updatedTokens;
          await user.save();
      
          return jsonS(res, 200, "FCM token removed successfully");
        } catch (error) {
          console.error("Error removing FCM token:", error);
          return jsonFailed(res, {}, "Internal Server Error", 500);
        }
    },
     updateUserDelivery: async (req, res) => {
        const { id } = req.user;
      
        try {
          const user = await User.findById(id);
          if (!user) {
            return jsonFailed(res, {}, "User not found", 404);
          }

          await User.updateOne({ _id: user._id }, { deliveryAddress: req.body });
      
          return jsonS(res, 200, "Delivery address updated successfully");
        } catch (error) {
          console.error("Error updating Deliver address:", error);
          return jsonFailed(res, {}, "Internal Server Error", 500);
        }
    },

    updateNotificationSettings: async (req, res) => {
        const { id } = req.user;
      
        try {
          const user = await User.findById(id);
          if (!user) {
            return jsonFailed(res, {}, "User not found", 404);
          }

          await User.updateOne({ _id: user._id }, { notification: req.body });
      
          return jsonS(res, 200, "Delivery address updated successfully");
        } catch (error) {
          console.error("Error updating Deliver address:", error);
          return jsonFailed(res, {}, "Internal Server Error", 500);
        }
    },

    getUserLevel: async (req, res) => {
        const user = await User.findById(req.user.id);
        return jsonS(res, 200, "User level fetched", {
          level: user.level,
          totalTransacted: user.totalTransacted
        });
    },

    getUserId: async (req, res) => {
      try {
        const u = await User.findById(req.params.id)
          .select("_id firstName lastName email phoneNumber") 
          .lean();
        if (!u) return res.status(404).json({ error: "Not found" });
        res.json(u);
      } catch (e) {
        console.error("internal get user error:", e);
        res.status(500).json({ error: "internal error" });
      }
    },

    //this is a temporary method to batch lookup for populatin sender and reeivers details.
    batchLookup: async (req, res) => {
      try {
        const ids = Array.from(new Set((req.body.ids || []).map(String))).filter(Boolean);
        if (!ids.length) return res.status(400).json({ error: "ids required" });

        const users = await User.find({ _id: { $in: ids } })
          .select("_id firstName lastName email phoneNumber")
          .lean();

        const map = {};
        for (const u of users) map[String(u._id)] = u;
        res.json({ users: map });
      } catch (e) {
        console.error("internal batch users error:", e);
        res.status(500).json({ error: "internal error" });
      }
    },

    userCount: async (req, res) => {
      try {
        const total = await User.countDocuments({ isDeleted: { $ne: true } });
        return jsonS(res, 200, 'OK', { count: total });
      } catch (e) {
        console.error('users.count error:', e);
        return jsonFailed(res, {}, 'Error', 500);
      }
    },

    //TODO: method to get users notification
};
module.exports = Controller;