const express = require("express");
const router = express.Router();

const { filterProducts } = require("../controllers/filterController");

router.get("/", filterProducts);

module.exports = router;