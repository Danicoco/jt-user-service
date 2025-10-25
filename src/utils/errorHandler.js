const Logger = require("./logger");
const utils = require(".");

const errorHandler = (err, req, res, next) => {
  console.log("Caught Errors--->", err);
  Logger.error(err.stack);
  Logger.error(`${err.name}: ${err.message}`);

  if (err.isOperational) {
    utils.jsonFailed(res, {}, err.message, err.code, err);
  } else if (err.name === "ValidationError") {
    utils.jsonFailed(res, {}, err.message, 406, err);
  } else if (err.name === "JsonWebTokenError") {
    utils.jsonFailed(res, {}, err.message, 409, err);
  } else if (err.name === "TokenExpiredError") {
    utils.jsonFailed(res, {}, err.message, 401, err);
  } else if (err.name === "SequelizeDatabaseError") {
    utils.jsonFailed(res, {}, err.message, 409, err);
  } else {
    utils.jsonFailed(res, {}, "Something went wrong in the server", 500, err);
  }
  return;
};

module.exports = errorHandler;
