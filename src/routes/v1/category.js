const express = require("express");
const { CategoryController } = require("../../http/controllers/category");

const router = express.Router();

router.get("/", CategoryController.listCategories);
router.get("/:id", CategoryController.getCategory);

module.exports = {
    baseUrl: "/category",
    router,
}