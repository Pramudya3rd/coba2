// controllers/bookingController.js
const db = require("../models");
const Booking = db.Booking;
const Villa = db.Villa;
const User = db.User;
const { Op } = require("sequelize");
const path = require("path"); // Diperlukan untuk Multer dan path file

// [POST] /api/bookings - Membuat Pemesanan Baru (Hanya Pengguna yang Login)
exports.createBooking = async (req, res) => {
  try {
    // totalPrice dihapus dari destructured body, karena akan dihitung di backend
    const { villaId, checkInDate, checkOutDate } = req.body;
    const userId = req.user.id; // ID pengguna dari token JWT yang sudah diautentikasi

    // Validasi input dasar
    if (!villaId || !checkInDate || !checkOutDate) {
      return res
        .status(400)
        .json({
          message:
            "Villa ID, tanggal Check-In, dan tanggal Check-Out wajib diisi.",
        });
    }

    // Cek apakah villa ada dan sudah verified
    const villa = await Villa.findByPk(villaId);
    if (!villa) {
      return res.status(404).json({ message: "Villa tidak ditemukan." });
    }
    if (villa.status !== "verified") {
      return res
        .status(403)
        .json({
          message: "Villa ini belum diverifikasi dan tidak dapat dipesan.",
        });
    }

    // Pastikan tanggal check-in/out valid (checkIn sebelum checkOut, tidak di masa lalu)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Atur ke awal hari ini untuk perbandingan

    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);

    if (inDate >= outDate) {
      return res
        .status(400)
        .json({ message: "Tanggal Check-Out harus setelah tanggal Check-In." });
    }
    if (inDate < today) {
      return res
        .status(400)
        .json({ message: "Tanggal Check-In tidak boleh di masa lalu." });
    }

    // Hitung durasi menginap dalam hari
    const oneDay = 24 * 60 * 60 * 1000; // milidetik dalam sehari
    const durationInDays = Math.round(Math.abs((outDate - inDate) / oneDay));

    // Hitung totalPrice secara otomatis
    // pricePerNight adalah DECIMAL, pastikan konversi ke number jika diperlukan untuk perhitungan
    const calculatedTotalPrice =
      parseFloat(villa.pricePerNight) * durationInDays;

    // Cek ketersediaan villa (tidak ada tumpang tindih booking)
    const overlappingBookings = await Booking.findAll({
      where: {
        villaId,
        status: { [Op.in]: ["pending", "confirmed"] }, // Hanya cek booking yang aktif
        [Op.or]: [
          {
            checkInDate: { [Op.lt]: outDate }, // Booking yang sudah ada dimulai sebelum checkout yang baru
            checkOutDate: { [Op.gt]: inDate }, // Booking yang sudah ada berakhir setelah checkout yang baru
          },
        ],
      },
    });

    if (overlappingBookings.length > 0) {
      return res
        .status(409)
        .json({ message: "Villa tidak tersedia pada tanggal yang dipilih." });
    }

    // Buat pemesanan baru dengan totalPrice yang dihitung
    const booking = await Booking.create({
      userId,
      villaId,
      checkInDate,
      checkOutDate,
      totalPrice: calculatedTotalPrice, // Gunakan harga yang dihitung di sini
      status: "pending", // Default status saat booking baru dibuat
    });

    res.status(201).json({
      message: "Pemesanan berhasil dibuat dan menunggu konfirmasi.",
      data: booking,
    });
  } catch (error) {
    console.error("Error saat membuat pemesanan:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// [GET] /api/bookings - Mendapatkan Semua Pemesanan (Disesuaikan berdasarkan Peran)
exports.getAllBookings = async (req, res) => {
  try {
    let whereClause = {};

    // Pengguna biasa hanya melihat pemesanan mereka sendiri
    if (req.user.role === "user") {
      whereClause.userId = req.user.id;
    }
    // Owner melihat pemesanan untuk villa mereka
    else if (req.user.role === "owner") {
      const ownerVillas = await Villa.findAll({
        where: { ownerId: req.user.id },
        attributes: ["id"], // Hanya ambil ID villa
      });
      const villaIds = ownerVillas.map((villa) => villa.id);
      whereClause.villaId = { [Op.in]: villaIds }; // Filter booking berdasarkan villa milik owner
    }
    // Admin melihat semua pemesanan
    else if (req.user.role === "admin") {
      // Tidak ada whereClause khusus, tampilkan semua
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
      order: [["createdAt", "DESC"]], // Urutkan dari yang terbaru
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

    // Logika otorisasi:
    // - Admin bisa melihat semua booking
    // - User biasa hanya bisa melihat booking miliknya
    // - Owner hanya bisa melihat booking untuk villa miliknya
    if (req.user.role === "admin") {
      // Admin diizinkan
    } else if (req.user.role === "user" && booking.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Ini bukan pemesanan Anda." });
    } else if (req.user.role === "owner") {
      const villa = await Villa.findByPk(booking.villaId);
      if (!villa || villa.ownerId !== req.user.id) {
        return res
          .status(403)
          .json({
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
    const { status } = req.body; // status diambil dari req.body
    const userRole = req.user.role;
    const userId = req.user.id;
    const paymentProofFile = req.file; // File bukti pembayaran diambil dari req.file Multer

    // Validasi status
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
      if (status !== "cancelled") {
        // User hanya boleh cancel booking mereka sendiri
        return res
          .status(403)
          .json({
            message:
              "Akses ditolak. Anda hanya dapat membatalkan pemesanan Anda sendiri.",
          });
      }
    } else {
      return res.status(403).json({ message: "Akses ditolak." });
    }
    // --- Akhir Otorisasi ---

    // Update status
    booking.status = status;

    // Jika ada file bukti pembayaran yang diunggah, simpan path-nya
    if (paymentProofFile) {
      // Path file relatif dari root backend (misal: uploads/payment-proofs/file-123.jpg)
      // URL yang akan disimpan di DB adalah path relatif ini
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
    // Tangani Multer error secara spesifik jika diperlukan
    const multer = require("multer"); // Impor Multer di sini jika belum (untuk instanceof)
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
