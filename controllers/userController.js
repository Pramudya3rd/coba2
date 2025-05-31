const db = require("../models");
const User = db.User;
const bcrypt = require("bcryptjs"); // Diperlukan jika admin bisa mengubah password

// [GET] /api/users - Mendapatkan semua pengguna (Hanya Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] }, // Jangan sertakan password
    });
    res.status(200).json({
      message: "Berhasil mendapatkan semua pengguna.",
      data: users,
    });
  } catch (error) {
    console.error("Error saat mendapatkan semua pengguna:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// [GET] /api/users/:id - Mendapatkan pengguna berdasarkan ID (Hanya Admin)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }
    res.status(200).json({
      message: "Berhasil mendapatkan pengguna.",
      data: user,
    });
  } catch (error) {
    console.error("Error saat mendapatkan pengguna berdasarkan ID:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// [PUT] /api/users/:id - Memperbarui pengguna berdasarkan ID (Hanya Admin)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password, role } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    // Perbarui data pengguna
    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.role = role || user.role;

    // Jika password baru diberikan, hash password tersebut
    if (password) {
      // Hook beforeUpdate di model User akan menangani hashing
      user.password = password;
    }

    await user.save(); // Simpan perubahan

    res.status(200).json({
      message: "Pengguna berhasil diperbarui.",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error saat memperbarui pengguna:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// [DELETE] /api/users/:id - Menghapus pengguna berdasarkan ID (Hanya Admin)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    await user.destroy(); // Hapus pengguna

    res.status(200).json({ message: "Pengguna berhasil dihapus." });
  } catch (error) {
    console.error("Error saat menghapus pengguna:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
