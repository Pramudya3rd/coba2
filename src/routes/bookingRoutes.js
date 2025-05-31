// src/routes/bookingRoutes.js
import { Router } from "express";
import {
  createBooking,
  uploadPayment,
  getUserBookings,
  getAllBookings,
  updateBookingStatus,
} from "../controllers/bookingController.js";
import {
  authenticateToken,
  authorizeRole,
} from "../middlewares/authMiddleware.js";
import { uploadPaymentProof } from "../utils/imageUpload.js";

const router = Router();

router.post("/", authenticateToken, createBooking);
router.post(
  "/upload-payment/:bookingId",
  authenticateToken,
  uploadPaymentProof.single("paymentProof"),
  uploadPayment
);
router.get("/my-bookings/:userId", authenticateToken, getUserBookings); // User's own bookings
router.get(
  "/all",
  authenticateToken,
  authorizeRole(["admin", "owner"]),
  getAllBookings
); // All bookings for admin/owner
router.put(
  "/status/:id",
  authenticateToken,
  authorizeRole(["admin", "owner"]),
  updateBookingStatus
); // Update booking status

export default router;
