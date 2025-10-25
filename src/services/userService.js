// src/services/userService.js
const { User } = require("../models/user");

const searchUsers = async (rawQuery) => {
  // 1) Normalize
  const q = rawQuery.trim().toLowerCase();

  // 2) Exact, case-insensitive match with regex anchors
  const users = await User.find({
    email: { $regex: `^${q}$`, $options: "i" }
  }).select("_id email");

  return users.map(u => ({
    id: u._id,
    email: u.email,
  }));
};

async function getUserById(userId) {
  const user = await User.findById(userId)
    .select('firstName lastName email')
    .lean();
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}


module.exports = { searchUsers, getUserById };
