const express = require("express");
const router = express.Router();
const landingController = require("../../controllers/user/landingController");
const authMiddleware = require("../../middlewares/authMiddleware");

router.get(
  "/",
  authMiddleware.preventAuthPages,
  landingController.loadLandingPage,
);

module.exports = router;
