const db = require("../models");
const Booking = db.Booking;
const Villa = db.Villa;
const User = db.User;
const { Op } = require("sequelize");
const path = require("path");
const multer = require("multer"); // Diperlukan untuk Multer error handling

// [POST] /api/bookings - Membuat Pemesanan Baru (Hanya Pengguna yang Login)
exports.createBooking = async (req, res) => {
  try {
    const { villaId, checkInDate, checkOutDate } = req.body;
    const userId = req.user.id; // Dipastikan ada dari auth middleware

    console.log("-----------------------------------------"); // Debug separator
    console.log(
      `[BACKEND] Percobaan booking: Villa ID: ${villaId}, Check-in: ${checkInDate}, Check-out: ${checkOutDate}, User ID: ${userId}`
    );

    if (!villaId || !checkInDate || !checkOutDate) {
      console.log("[BACKEND] Validasi Gagal: Missing required fields.");
      return res.status(400).json({
        message:
          "Villa ID, tanggal Check-In, dan tanggal Check-Out wajib diisi.",
      });
    }

    const villa = await Villa.findByPk(villaId);
    if (!villa) {
      console.log("[BACKEND] Validasi Gagal: Villa tidak ditemukan.");
      return res.status(404).json({ message: "Villa tidak ditemukan." });
    }
    if (villa.status !== "verified") {
      console.log("[BACKEND] Validasi Gagal: Villa belum diverifikasi.");
      return res.status(403).json({
        message: "Villa ini belum diverifikasi dan tidak dapat dipesan.",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Atur waktu ke awal hari untuk perbandingan tanggal saja

    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);

    // Pastikan tanggal yang masuk adalah tanggal yang valid
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
      console.log("[BACKEND] Validasi Gagal: Format tanggal tidak valid.");
      return res.status(400).json({ message: "Format tanggal tidak valid." });
    }

    if (inDate >= outDate) {
      console.log(
        "[BACKEND] Validasi Gagal: Check-Out harus setelah Check-In."
      );
      return res
        .status(400)
        .json({ message: "Tanggal Check-Out harus setelah tanggal Check-In." });
    }
    if (inDate < today) {
      console.log("[BACKEND] Validasi Gagal: Check-In di masa lalu.");
      return res
        .status(400)
        .json({ message: "Tanggal Check-In tidak boleh di masa lalu." });
    }

    const oneDay = 24 * 60 * 60 * 1000; // milidetik dalam sehari
    const durationInDays = Math.round(Math.abs((outDate - inDate) / oneDay));

    const calculatedTotalPrice =
      parseFloat(villa.pricePerNight) * durationInDays;

    console.log(
      `[BACKEND] Mencari booking tumpang tindih untuk Villa ID: ${villaId}, dari ${
        inDate.toISOString().split("T")[0]
      } sampai ${outDate.toISOString().split("T")[0]}`
    );
    console.log("[BACKEND] Status yang dicari: pending, confirmed");

    const overlappingBookings = await Booking.findAll({
      where: {
        villaId,
        status: { [Op.in]: ["pending", "confirmed"] },
        [Op.or]: [
          {
            checkInDate: { [Op.lt]: outDate }, // Booking existing dimulai sebelum booking baru berakhir
            checkOutDate: { [Op.gt]: inDate }, // Booking existing berakhir setelah booking baru dimulai
          },
        ],
      },
    });

    console.log(
      `[BACKEND] Ditemukan ${overlappingBookings.length} booking yang tumpang tindih.`
    );
    if (overlappingBookings.length > 0) {
      console.log(
        "[BACKEND] Detail booking yang tumpang tindih:",
        overlappingBookings.map((b) => ({
          id: b.id,
          checkIn: b.checkInDate,
          checkOut: b.checkOutDate,
          status: b.status,
        }))
      );
      return res
        .status(409)
        .json({ message: "Villa tidak tersedia pada tanggal yang dipilih." });
    }

    const booking = await Booking.create({
      userId,
      villaId,
      checkInDate,
      checkOutDate,
      totalPrice: calculatedTotalPrice,
      status: "pending",
    });

    console.log("[BACKEND] Booking berhasil dibuat."); // Log untuk sukses
    res.status(201).json({
      message: "Pemesanan berhasil dibuat dan menunggu konfirmasi.",
      data: booking,
    });
  } catch (error) {
    console.error("[BACKEND] Error saat membuat pemesanan:", error);
    const multer = require("multer");
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// [GET] /api/bookings - Mendapatkan Semua Pemesanan (Disesuaikan berdasarkan Peran)
exports.getAllBookings = async (req, res) => {
  try {
    let whereClause = {};

    if (req.user.role === "user") {
      whereClause.userId = req.user.id;
    } else if (req.user.role === "owner") {
      const ownerVillas = await Villa.findAll({
        where: { ownerId: req.user.id },
        attributes: ["id"],
      });
      const villaIds = ownerVillas.map((villa) => villa.id);
      whereClause.villaId = { [Op.in]: villaIds };
    } else if (req.user.role === "admin") {
      // Admin melihat semua pemesanan
    } else {
      return res.status(403).json({ message: "Akses ditolak." });
    }

    const bookings = await Booking.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: Villa,
          as: "villa",
          attributes: ["id", "name", "location", "pricePerNight", "ownerId"],
          include: [
            {
              model: User,
              as: "owner",
              attributes: ["id", "name", "email", "phone"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      message: "Berhasil mendapatkan daftar pemesanan.",
      data: bookings,
    });
  } catch (error) {
    console.error("Error saat mendapatkan pemesanan:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// [GET] /api/bookings/:id - Mendapatkan Detail Pemesanan berdasarkan ID
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: Villa,
          as: "villa",
          attributes: ["id", "name", "location", "pricePerNight", "ownerId"],
          include: [
            {
              model: User,
              as: "owner",
              attributes: ["id", "name", "email", "phone"],
            },
          ],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({ message: "Pemesanan tidak ditemukan." });
    }

    if (req.user.role === "admin") {
      // Admin diizinkan
    } else if (req.user.role === "user" && booking.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Ini bukan pemesanan Anda." });
    } else if (req.user.role === "owner") {
      const villa = await Villa.findByPk(booking.villaId);
      if (!villa || villa.ownerId !== req.user.id) {
        return res.status(403).json({
          message: "Akses ditolak. Ini bukan pemesanan untuk villa Anda.",
        });
      }
    }

    res.status(200).json({
      message: "Berhasil mendapatkan detail pemesanan.",
      data: booking,
    });
  } catch (error) {
    console.error("Error saat mendapatkan pemesanan berdasarkan ID:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// [PUT] /api/bookings/:id/status - Memperbarui Status Pemesanan (Oleh Owner atau Admin, atau User untuk cancel)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = req.user.role;
    const userId = req.user.id;
    const paymentProofFile = req.file;

    if (!["pending", "confirmed", "cancelled", "completed"].includes(status)) {
      return res.status(400).json({ message: "Status tidak valid." });
    }

    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Villa,
          as: "villa",
          attributes: ["ownerId"],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({ message: "Pemesanan tidak ditemukan." });
    }

    // --- Otorisasi ---
    if (userRole === "admin") {
      // Admin diizinkan
    } else if (userRole === "owner") {
      if (!booking.villa || booking.villa.ownerId !== userId) {
        return res
          .status(403)
          .json({ message: "Akses ditolak. Anda bukan pemilik villa ini." });
      }
    } else if (userRole === "user") {
      if (booking.userId !== userId) {
        return res
          .status(403)
          .json({ message: "Akses ditolak. Ini bukan pemesanan Anda." });
      }
      // BARIS PERBAIKAN: Izinkan user untuk mengubah status ke 'cancelled' ATAU 'pending'
      if (!["cancelled", "pending"].includes(status)) {
        return res.status(403).json({
          message:
            "Akses ditolak. Pengguna hanya dapat membatalkan pemesanan atau mengunggah bukti pembayaran.",
        });
      }
    } else {
      return res.status(403).json({ message: "Akses ditolak." });
    }
    // --- Akhir Otorisasi ---

    booking.status = status;

    if (paymentProofFile) {
      const fileUrl = `/uploads/payment-proofs/${paymentProofFile.filename}`;
      booking.paymentProof = fileUrl;
    }

    await booking.save();

    res.status(200).json({
      message: `Status pemesanan berhasil diperbarui menjadi ${status}.`,
      data: booking,
    });
  } catch (error) {
    console.error("Error saat memperbarui status pemesanan:", error);
    const multer = require("multer");
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
