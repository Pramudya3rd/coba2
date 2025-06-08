// controllers/resetPasswordController.js
const db = require("../models");
const User = db.User;
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // Untuk membuat token reset yang aman
const nodemailer = require("nodemailer"); // Untuk mengirim email

// Konfigurasi Nodemailer (ganti dengan kredensial email Anda)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE, // e.g., 'gmail'
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password
  },
});

// [POST] /api/auth/forgot-password - Meminta link reset password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "Email tidak ditemukan." });
    }

    // Buat token reset (contoh sederhana, bisa lebih kompleks dengan timestamp dll.)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = Date.now() + 3600000; // 1 jam dari sekarang

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    // Buat URL reset password untuk frontend
    // Pastikan VITE_FRONTEND_URL diatur di .env backend Anda
    // --- BARIS PERBAIKAN: Gunakan sintaks template literal JavaScript yang benar ---
    const resetUrl = `${process.env.VITE_FRONTEND_URL}/reset-password?token=${resetToken}&email=${user.email}`;
    // --- AKHIR BARIS PERBAIKAN ---

    // Tambahkan console.log untuk debugging, bisa dihapus setelah fix
    console.log("Generated Reset URL for email:", resetUrl);

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Permintaan Reset Password Anda",
      html: `
        <p>Anda menerima email ini karena Anda (atau orang lain) telah meminta reset password untuk akun Anda.</p>
        <p>Silakan klik link berikut, atau salin ini ke browser Anda untuk menyelesaikan prosesnya:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Link ini akan kadaluwarsa dalam satu jam.</p>
        <p>Jika Anda tidak meminta ini, mohon abaikan email ini dan password Anda akan tetap sama.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: "Link reset password telah dikirim ke email Anda.",
    });
  } catch (error) {
    console.error("Error sending reset password email:", error);
    res.status(500).json({
      message: "Gagal mengirim link reset password. Server error.",
      error: error.message,
    });
  }
};

// [POST] /api/auth/reset-password - Mereset password dengan token
exports.resetPassword = async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token, email, dan password baru wajib diisi." });
    }

    const user = await User.findOne({
      where: {
        email,
        resetPasswordToken: token,
        resetPasswordExpires: { [db.Sequelize.Op.gt]: Date.now() }, // Token belum kadaluwarsa
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Token tidak valid atau sudah kadaluwarsa." });
    }

    user.password = newPassword; // Hook beforeUpdate di model User akan menghash password
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ message: "Password berhasil direset." });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      message: "Gagal mereset password. Server error.",
      error: error.message,
    });
  }
};
