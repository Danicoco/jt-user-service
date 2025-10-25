require('dotenv').config();  
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const morganMiddleware = require("./utils/morgan");
const errorHandler = require("./utils/errorHandler");
const { jsonS } = require("./utils");
const validateRequiredEnvs = require("./utils/requiredEnvs");
const apiRoute = require("./routes/v1");

const app = express();

// 1. Validate environment variables
validateRequiredEnvs();

app.set("trust proxy", true);

// 2. Middleware stack
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    limits: { fileSize: 5 * 1024 * 1024 },
  })
);

app.use(
  session({
    secret: "thisisasecretpasskey",
    saveUninitialized: true,
    resave: true,
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

app.use(helmet());
app.use(cors());               
app.use(morganMiddleware); 

app.use("/api/v1/", apiRoute);

app.all("/", (req, res) =>
  jsonS(res, 200, `Online by ${new Date()} on ${req.app.get("env")} environment`, {})
);

app.use((req, res, next) => {
  const err = new Error(
    `${req.ip} tried to reach ${req.originalUrl}, but nothing matched.`
  );
  err.code = 404;
  err.isOperational = true;
  next(err);
});

app.use(errorHandler);

module.exports = app;
