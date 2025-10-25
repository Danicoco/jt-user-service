const { INTERNAL_SECRET } = require("../../config");

module.exports = (req, res, next) => {
  const key = req.headers["x-internal-key"];
  if (!key || key !== INTERNAL_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};
