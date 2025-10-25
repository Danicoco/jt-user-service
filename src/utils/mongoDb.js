const mongoose = require("mongoose");

const { DB } = require("../config");
const db = mongoose.createConnection(DB);

const connectDB = async () => {
  try {
    console.log(`Connecting to MongoDB: ${DB}`);

    mongoose.set("debug", true);
    mongoose.set("strictQuery", true);

    // handlers
    db.on("connecting", () => {
      console.log("\x1b[32m", "MongoDB :: connecting");
    });

    db.on("error", (error) => {
      console.log("\x1b[31m", `MongoDB :: connection ${error}`);
      mongoose.disconnect();
    });

    db.on("connected", () => {
      console.log("\x1b[32m", "MongoDB :: connected");
    });

    db.once("open", () => {
      console.log("\x1b[32m", "MongoDB :: connection opened");
    });

    db.on("reconnected", () => {
      console.log('\x1b[33m"', "MongoDB :: reconnected");
    });

    db.on("reconnectFailed", () => {
      console.log("\x1b[31m", "MongoDB :: reconnectFailed");
    });

    db.on("disconnected", () => {
      console.log("\x1b[31m", "MongoDB :: disconnected");
    });

    db.on("fullsetup", () => {
      console.log('\x1b[33m"', "MongoDB :: reconnecting... %d");
    });
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1); // Exit process with failure
  }
};

module.exports = { connectDB, db };
