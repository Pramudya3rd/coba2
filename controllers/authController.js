const db = require("../models");
const User = db.User; // Ambil model User
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Fungsi pembantu untuk membuat token JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "1d", // Token berlaku selama 1 hari
  });
};

// [POST] /api/auth/register - Mendaftarkan pengguna baru
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Validasi input dasar
    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({
          message: "Semua field wajib diisi (Nama, Email, Password, Role).",
        });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email sudah terdaftar." });
    }

    // Buat pengguna baru
    const user = await User.create({ name, email, phone, password, role });

    // Buat token JWT
    const token = generateToken(user.id, user.role);

    res.status(201).json({
      message: "Pendaftaran berhasil!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error saat pendaftaran:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// [POST] /api/auth/login - Login pengguna
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email dan password wajib diisi." });
    }

    // Cari pengguna berdasarkan email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Email atau password salah." });
    }

    // Bandingkan password
    const isMatch = await user.comparePassword(password); // Menggunakan metode instance comparePassword
    if (!isMatch) {
      return res.status(401).json({ message: "Email atau password salah." });
    }

    // Buat token JWT
    const token = generateToken(user.id, user.role);

    res.status(200).json({
      message: "Login berhasil!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error saat login:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
