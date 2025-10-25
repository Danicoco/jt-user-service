const morgan = require("morgan");
const Logger = require("./logger");
const moment = require("moment");
// Override the stream method by telling
// Morgan to use our custom logger instead of the
const stream = {
  // Use the http severity
  write: (message) => Logger.http(message),
};

morgan.token("ip", (request, response) => request.ip);
morgan.token("timestamp", () => moment().format());
// Build the morgan middleware
const morganMiddleware = morgan(
  ":method :url :status -- :response-time ms -- :ip",
  { stream }
);

module.exports = morganMiddleware;
