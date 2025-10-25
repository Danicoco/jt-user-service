const glob = require("glob");
const express = require("express");

const router = express.Router();

glob
  .sync("*.js", {
    cwd: __dirname,
    ignore: "index.js",
  })
  .forEach((file) => {
    const fileRoutes = require(`./${file}`);
    router.use(fileRoutes.baseUrl, fileRoutes.router);
  });

module.exports = router