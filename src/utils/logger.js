const winston = require("winston");

const levels = {
  error: 0,
  http: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

const level = () => {
  const env = process.env.NODE_ENV || "development";
  const isDevelopment = env === "development";
  return isDevelopment ? "debug" : "warn";
};

const colors = {
  error: "red",
  warn: "yellow",
  http: "magenta",
  info: "green",
  debug: "white",
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.label({ label: "[logs]" }),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [ ${info.level} ]: ${info.message}`
  ),
  winston.format.errors({ stack: true })
  // winston.format.json()
);

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    level: "error",
    filename: "logs/error.log",
  }),
  new winston.transports.File({
    level: "http",
    filename: "logs/request.log",
  }),
  new winston.transports.File({ filename: "logs/all.log" }),
];

const Logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: "logs/exceptions.log" }),
    new winston.transports.Console(),
  ],
});

module.exports = Logger;
