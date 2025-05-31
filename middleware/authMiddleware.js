const jwt = require("jsonwebtoken");
const db = require("../models");
const User = db.User;

exports.authenticateToken = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ["password"] },
      });

      // Jika user tidak ditemukan tapi token valid (misal user sudah dihapus dari DB), tetap tolak
      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Token tidak valid, pengguna tidak ditemukan." });
      }

      next(); // Lanjutkan dengan req.user terisi
    } catch (error) {
      console.error("Error saat verifikasi token:", error);
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Token kadaluwarsa, silakan login kembali." });
      }
      return res.status(401).json({ message: "Token tidak valid." });
    }
  } else {
    // Jika tidak ada token, biarkan req.user kosong dan lanjutkan
    // Ini membuat autentikasi opsional untuk rute publik.
    req.user = null; // Pastikan req.user null jika tidak ada token
    next();
  }
};

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Autentikasi diperlukan untuk otorisasi." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Akses ditolak. Pengguna dengan peran ${req.user.role} tidak diizinkan untuk mengakses ini.`,
      });
    }
    next();
  };
};
