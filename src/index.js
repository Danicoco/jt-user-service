const app = require("./app");
const Logger = require("./utils/logger");

const { PORT } = require("./config");
const { connectDB } = require("./utils/mongoDb");

let server;
try {
  connectDB();

  server = app.listen(process.env.PORT || 3002, "0.0.0.0", () => {
    Logger.info(`app running on ${PORT}`);
  });
} catch (error) {
  Logger.error("Failed to start:", error);
  process.exit(1);
}

setInterval(() => {
  const used = process.memoryUsage();
  //console.log(`[MEM USAGE] Heap used: ${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`);
}, 5000);

process.on("uncaughtException", (err) => {
  Logger.warn("Uncaught Exception!! Shutting down process..");
  Logger.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  Logger.warn("Unhandled Rejection!!" + err);
  // process.exit(1);
});

module.exports = server;
