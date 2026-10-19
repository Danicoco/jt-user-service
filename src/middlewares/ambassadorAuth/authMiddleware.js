const jwt = require("jsonwebtoken");
const config = require("../../config/jwt");
const { getAccountStatus } = require("../../services/accountStatusService");

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
      if (!decoded?.isGen) {
        return res.status(403).json({
          auth: false,
          message: "Token expired or invalid.",
          error: "Invalid token",
        });
      }
      req.user = decoded;

      // tokens outlive account changes, so check the account is still usable
      getAccountStatus(String(decoded.id || decoded._id))
        .then(({ blocked, reason }) => {
          if (blocked) {
            return res.status(403).json({ auth: false, message: reason, error: "Account inactive" });
          }
          next();
        })
        .catch((e) => {
          console.error("authMiddleware account status error:", e);
          return res.status(503).json({ auth: false, message: "Service temporarily unavailable" });
        });
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
