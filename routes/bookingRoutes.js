// routes/bookingRoutes.js
const express = require("express");
// const router = express.Router(); // Hapus atau jadikan komentar ini
const bookingController = require("../controllers/bookingController");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// UBAH module.exports menjadi fungsi yang menerima 'upload'
module.exports = (upload) => {
  // <-- UBAH INI
  const router = express.Router(); // <-- DEKLARASIKAN ROUTER DI SINI

  router.post(
    "/",
    authenticateToken,
    authorizeRoles("user"),
    bookingController.createBooking
  );

  // Rute untuk memperbarui status pemesanan, sekarang akan menerima file
  router.put(
    "/:id/status",
    authenticateToken,
    authorizeRoles("user", "owner", "admin"),
    upload.single("paymentProof"), // <-- TAMBAHKAN MIDDLEWARE UPLOAD MULTER DI SINI
    bookingController.updateBookingStatus
  );

  // Rute lainnya tetap sama
  router.get(
    "/",
    authenticateToken,
    authorizeRoles("user", "owner", "admin"),
    bookingController.getAllBookings
  );

  router.get(
    "/:id",
    authenticateToken,
    authorizeRoles("user", "owner", "admin"),
    bookingController.getBookingById
  );

  return router;
};
