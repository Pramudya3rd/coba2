// src/controllers/bookingController.js
import { pool } from "../config/db.js";
import { uploadPaymentProof } from "../utils/imageUpload.js";

export const createBooking = async (req, res) => {
  const {
    villaId,
    checkInDate,
    checkOutDate,
    firstName,
    lastName,
    email,
    phone,
    duration,
    totalPrice,
  } = req.body;
  const userId = req.user.id; // From authenticateToken middleware

  if (
    !villaId ||
    !checkInDate ||
    !checkOutDate ||
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !duration ||
    !totalPrice
  ) {
    return res
      .status(400)
      .json({ message: "All booking details are required." });
  }

  try {
    // Check villa availability
    const [conflictingBookings] = await pool.execute(
      'SELECT COUNT(*) as count FROM bookings WHERE villa_id = ? AND ((check_in_date <= ? AND check_out_date >= ?) OR (check_in_date <= ? AND check_out_date >= ?)) AND status != "Cancelled"',
      [villaId, checkOutDate, checkInDate, checkInDate, checkOutDate]
    );

    if (conflictingBookings[0].count > 0) {
      return res
        .status(409)
        .json({ message: "Villa is not available for the selected dates." });
    }

    const [result] = await pool.execute(
      "INSERT INTO bookings (user_id, villa_id, check_in_date, check_out_date, total_price, status) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, villaId, checkInDate, checkOutDate, totalPrice, "Pending"]
    );

    res
      .status(201)
      .json({
        message:
          "Booking requested successfully! Please proceed to payment confirmation.",
        bookingId: result.insertId,
      });
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({ message: "Server error during booking creation." });
  }
};

export const uploadPayment = async (req, res) => {
  const { bookingId } = req.params;
  const paymentProofFile = req.file;
  const userId = req.user.id;

  if (!paymentProofFile) {
    return res.status(400).json({ message: "Payment proof file is required." });
  }

  const paymentProofUrl = `/uploads/payments/${paymentProofFile.filename}`;

  try {
    const [result] = await pool.execute(
      'UPDATE bookings SET payment_proof_url = ?, status = "Booked" WHERE id = ? AND user_id = ?',
      [paymentProofUrl, bookingId, userId]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Booking not found or not authorized." });
    }

    res.json({
      message: "Payment proof uploaded successfully! Booking confirmed.",
      paymentProofUrl,
    });
  } catch (error) {
    console.error("Error uploading payment proof:", error);
    res.status(500).json({ message: "Server error uploading payment proof." });
  }
};

export const getUserBookings = async (req, res) => {
  const { userId } = req.params;
  if (
    req.user.role === "user" &&
    req.user.id !== parseInt(userId) &&
    req.user.role !== "owner"
  ) {
    return res.sendStatus(403);
  }

  try {
    const [rows] = await pool.execute(
      `SELECT b.id, v.name as villa_name, b.check_in_date, b.check_out_date, b.total_price, b.status
             FROM bookings b
             JOIN villas v ON b.villa_id = v.id
             WHERE b.user_id = ? ORDER BY b.created_at DESC`,
      [userId]
    );

    const activities = rows.map((booking) => ({
      date: new Date(booking.check_in_date).getDate().toString(),
      month: new Date(booking.check_in_date)
        .toLocaleString("en-US", { month: "short" })
        .toUpperCase(),
      name: booking.villa_name,
      status: booking.status.toUpperCase(),
      price: `Rp ${booking.total_price.toLocaleString("id-ID")}`,
    }));

    res.json(activities);
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({ message: "Server error fetching bookings." });
  }
};

export const getAllBookings = async (req, res) => {
  let query = `SELECT b.id, u.name as user_name, u.email as user_email, u.phone as user_phone, u.role as user_role,
                        v.name as villa_name, v.address as villa_address,
                        b.check_in_date, b.check_out_date, b.total_price, b.status
                 FROM bookings b
                 JOIN users u ON b.user_id = u.id
                 JOIN villas v ON b.villa_id = v.id`;
  const queryParams = [];

  if (req.user.role === "owner") {
    query += ` WHERE v.owner_id = ?`;
    queryParams.push(req.user.id);
  }
  query += ` ORDER BY b.created_at DESC`;

  try {
    const [rows] = await pool.execute(query, queryParams);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching all bookings:", error);
    res.status(500).json({ message: "Server error fetching all bookings." });
  }
};

export const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["Booked", "Pending", "Cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid status provided." });
  }

  try {
    if (req.user.role === "owner") {
      const [bookingVilla] = await pool.execute(
        "SELECT v.owner_id FROM bookings b JOIN villas v ON b.villa_id = v.id WHERE b.id = ?",
        [id]
      );
      if (!bookingVilla[0] || bookingVilla[0].owner_id !== req.user.id) {
        return res.sendStatus(403);
      }
    }

    const [result] = await pool.execute(
      "UPDATE bookings SET status = ? WHERE id = ?",
      [status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Booking not found." });
    }
    res.json({ message: `Booking status updated to ${status} successfully!` });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ message: "Server error updating booking status." });
  }
};
