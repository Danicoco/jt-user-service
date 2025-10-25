const jwt = require("jsonwebtoken");
const config = require("../../config/jwt");

const middleware = (req, res, next) => {
  try {
    let token =
      req.headers["access-token"] ||
      (req.body && req.body["access-token"]) ||
      req.headers.authorization ||
      req.get("Authorization");

    if (!token) {
      return res.status(403).json({
        auth: false,
        message: "Access Denied, No token provided.",
        error: "Access Denied",
      });
    }

    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    jwt.verify(token, config.jwt_secret, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          auth: false,
          message: "Token expired or invalid.",
          error: err.message,
        });
      }
      req.user = decoded;
      next();
    });
  } catch (err) {
    console.error("Caught authMiddleware error:", err);
    return res.status(500).json({
      auth: false,
      message: "Internal Server Error in auth middleware.",
      error: err.message,
    });
  }
};

module.exports = middleware;
