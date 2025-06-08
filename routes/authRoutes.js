// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const resetPasswordController = require("../controllers/resetPasswordController"); // Import controller baru

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", resetPasswordController.forgotPassword); // Tambahkan rute ini
router.post("/reset-password", resetPasswordController.resetPassword); // Tambahkan rute ini

module.exports = router;
