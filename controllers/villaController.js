const db = require("../models");
const Villa = db.Villa;
const User = db.User; // Mungkin perlu untuk mengambil data owner
const path = require("path");

// [POST] /api/villas - Menambah Villa Baru (Hanya Owner)
exports.createVilla = async (req, res) => {
  try {
    const {
      name,
      location,
      description,
      guestCapacity,
      pricePerNight,
      size,
      bedType,
      features,
    } = req.body;
    const ownerId = req.user.id;

    // Ambil file dari Multer
    const mainImageFile = req.files?.mainImage ? req.files.mainImage[0] : null;
    const additionalImageFiles = req.files?.additionalImages || [];

    // Validasi input dasar
    if (
      !name ||
      !location ||
      !description ||
      !guestCapacity ||
      !pricePerNight
    ) {
      return res.status(400).json({
        message:
          "Nama, lokasi, deskripsi, kapasitas tamu, dan harga per malam wajib diisi.",
      });
    }
    if (!mainImageFile) {
      return res
        .status(400)
        .json({ message: "Gambar utama villa wajib diunggah." });
    }

    // Buat URL relatif untuk gambar
    const mainImage = `/uploads/villa-images/${mainImageFile.filename}`;
    const additionalImages = additionalImageFiles.map(
      (file) => `/uploads/villa-images/${file.filename}`
    );

    // Buat villa baru dengan status pending
    const villa = await Villa.create({
      name,
      location,
      description,
      guestCapacity,
      pricePerNight: parseFloat(pricePerNight), // Pastikan ini float
      size,
      bedType,
      mainImage,
      additionalImages,
      features: JSON.parse(features || "[]"), // Fitur sekarang stringified JSON dari frontend
      ownerId,
      status: "pending",
    });

    res.status(201).json({
      message: "Villa berhasil ditambahkan dan menunggu verifikasi admin.",
      data: villa,
    });
  } catch (error) {
    console.error("Error saat membuat villa:", error);
    // Tangani Multer error secara spesifik jika diperlukan
    const multer = require("multer"); // Impor Multer di sini jika belum (untuk instanceof)
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// [GET] /api/villas - Mendapatkan semua Villa (Untuk Umum, Owner, dan Admin)
exports.getAllVillas = async (req, res) => {
  try {
    let whereClause = {};

    // Jika user adalah admin, tampilkan semua villa (termasuk pending dan rejected)
    // Jika user adalah owner, tampilkan villa miliknya saja (termasuk pending dan rejected)
    // Jika user bukan owner/admin, tampilkan hanya villa yang sudah verified
    if (req.user && req.user.role === "admin") {
      // Admin melihat semua villa
    } else if (req.user && req.user.role === "owner") {
      // Owner melihat villa miliknya
      whereClause.ownerId = req.user.id;
    } else {
      // Pengguna umum hanya melihat villa yang sudah verified
      whereClause.status = "verified";
    }

    const villas = await Villa.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "owner",
          attributes: ["id", "name", "email", "phone"], // Sertakan detail owner
        },
      ],
    });
    res.status(200).json({
      message: "Berhasil mendapatkan daftar villa.",
      data: villas,
    });
  } catch (error) {
    console.error("Error saat mendapatkan semua villa:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// [GET] /api/villas/:id - Mendapatkan Villa berdasarkan ID
exports.getVillaById = async (req, res) => {
  try {
    const { id } = req.params;
    const villa = await Villa.findByPk(id, {
      include: [
        {
          model: User,
          as: "owner",
          attributes: ["id", "name", "email", "phone"],
        },
      ],
    });

    if (!villa) {
      return res.status(404).json({ message: "Villa tidak ditemukan." });
    }

    // Logika otorisasi untuk melihat villa tertentu:
    // - Admin bisa melihat semua villa
    // - Owner hanya bisa melihat villa miliknya sendiri
    // - User biasa hanya bisa melihat villa yang statusnya 'verified'
    if (req.user && req.user.role === "admin") {
      // Admin diizinkan
    } else if (
      req.user &&
      req.user.role === "owner" &&
      villa.ownerId === req.user.id
    ) {
      // Owner diizinkan untuk melihat villa miliknya
    } else if (
      villa.status !== "verified" &&
      (!req.user || (req.user.role !== "admin" && req.user.role !== "owner"))
    ) {
      // Jika villa belum verified DAN user bukan admin/owner, tolak
      return res.status(403).json({
        message:
          "Akses ditolak. Villa belum diverifikasi atau Anda tidak memiliki izin.",
      });
    } else if (
      villa.status !== "verified" &&
      req.user &&
      req.user.role === "user"
    ) {
      // Jika user adalah 'user' dan villa belum verified, tolak
      return res
        .status(403)
        .json({ message: "Akses ditolak. Villa belum diverifikasi." });
    }

    res.status(200).json({
      message: "Berhasil mendapatkan detail villa.",
      data: villa,
    });
  } catch (error) {
    console.error("Error saat mendapatkan villa berdasarkan ID:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// [PUT] /api/villas/:id - Memperbarui Villa (Hanya Owner yang memiliki villa tersebut)
exports.updateVilla = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      location,
      description,
      guestCapacity,
      pricePerNight,
      size,
      bedType,
      features,
    } = req.body;
    const userId = req.user.id;

    // Ambil file dari Multer jika ada yang baru diunggah
    const mainImageFile = req.files?.mainImage ? req.files.mainImage[0] : null;
    const additionalImageFiles = req.files?.additionalImages || [];

    const villa = await Villa.findByPk(id);
    if (!villa) {
      return res.status(404).json({ message: "Villa tidak ditemukan." });
    }

    // Hanya owner yang memiliki villa yang boleh memperbaruinya
    if (villa.ownerId !== userId) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Anda bukan pemilik villa ini." });
    }

    // Perbarui data villa
    villa.name = name || villa.name;
    villa.location = location || villa.location;
    villa.description = description || villa.description;
    villa.guestCapacity = guestCapacity
      ? parseInt(guestCapacity)
      : villa.guestCapacity;
    villa.pricePerNight = pricePerNight
      ? parseFloat(pricePerNight)
      : villa.pricePerNight;
    villa.size = size || villa.size;
    villa.bedType = bedType || villa.bedType;
    villa.features = features ? JSON.parse(features) : villa.features;

    // Jika ada mainImage baru diunggah, perbarui URL-nya
    if (mainImageFile) {
      // Opsional: Hapus gambar lama dari server jika tidak lagi digunakan
      // fs.unlink(path.join(__dirname, '..', villa.mainImage), (err) => {
      //   if (err) console.error("Failed to delete old main image:", err);
      // });
      villa.mainImage = `/uploads/villa-images/${mainImageFile.filename}`;
    }
    // Jika ada additionalImages baru diunggah, tambahkan ke yang sudah ada
    if (additionalImageFiles.length > 0) {
      const newAdditionalImageUrls = additionalImageFiles.map(
        (file) => `/uploads/villa-images/${file.filename}`
      );
      // Anda mungkin ingin menghapus yang lama atau menggantinya sepenuhnya tergantung UI Anda
      // Untuk saat ini, kita gabungkan. Jika ingin mengganti, ganti dengan: villa.additionalImages = newAdditionalImageUrls;
      villa.additionalImages = [
        ...(villa.additionalImages || []),
        ...newAdditionalImageUrls,
      ];
    }

    // Atur kembali status ke 'pending' jika ada perubahan data penting
    villa.status = "pending";

    await villa.save();

    res.status(200).json({
      message:
        "Villa berhasil diperbarui dan statusnya diatur kembali ke pending untuk verifikasi ulang.",
      data: villa,
    });
  } catch (error) {
    console.error("Error saat memperbarui villa:", error);
    const multer = require("multer");
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// [DELETE] /api/villas/:id - Menghapus Villa (Hanya Owner yang memiliki villa tersebut ATAU Admin)
exports.deleteVilla = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const villa = await Villa.findByPk(id);
    if (!villa) {
      return res.status(404).json({ message: "Villa tidak ditemukan." });
    }

    // Hanya owner yang memiliki villa ATAU admin yang boleh menghapus
    if (villa.ownerId !== userId && userRole !== "admin") {
      return res.status(403).json({
        message:
          "Akses ditolak. Anda tidak memiliki izin untuk menghapus villa ini.",
      });
    }

    await villa.destroy(); // Hapus villa

    res.status(200).json({ message: "Villa berhasil dihapus." });
  } catch (error) {
    console.error("Error saat menghapus villa:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// [PUT] /api/villas/:id/status - Memperbarui Status Villa (Hanya Admin)
exports.updateVillaStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // status bisa 'verified' atau 'rejected'

    // Validasi status
    if (!["pending", "verified", "rejected"].includes(status)) {
      return res.status(400).json({
        message:
          'Status tidak valid. Hanya "pending", "verified", atau "rejected" yang diizinkan.',
      });
    }

    const villa = await Villa.findByPk(id);
    if (!villa) {
      return res.status(404).json({ message: "Villa tidak ditemukan." });
    }

    villa.status = status;
    await villa.save();

    res.status(200).json({
      message: `Status villa berhasil diperbarui menjadi ${status}.`,
      data: villa,
    });
  } catch (error) {
    console.error("Error saat memperbarui status villa:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
