// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const db = require("./models");
const app = express();
const PORT = process.env.PORT || 5000;

// Impor rute
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const villaRoutes = require("./routes/villaRoutes"); // Import rute villa
const bookingRoutes = require("./routes/bookingRoutes");
const contactRoutes = require("./routes/contactRoutes");

// Impor error handler
const errorHandler = require("./middleware/errorHandler");

// Middleware standar
app.use(express.json());
app.use(cors());

// --- Konfigurasi File Statis ---
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Gunakan rute kontak ---
app.use("/api/contact", contactRoutes);

// --- Konfigurasi Multer untuk Bukti Pembayaran ---
const paymentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/payment-proofs/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix =
      Date.now() + "-payment-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const paymentFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new Error("Hanya file gambar yang diizinkan untuk bukti pembayaran!"),
      false
    );
  }
};

const uploadPayment = multer({
  storage: paymentStorage,
  fileFilter: paymentFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// --- Konfigurasi Multer untuk Gambar Villa ---
const villaImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/villa-images/"); // Folder tujuan untuk gambar villa
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix =
      Date.now() + "-villa-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const villaImageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file gambar yang diizinkan untuk villa!"), false);
  }
};

const uploadVillaImages = multer({
  storage: villaImageStorage,
  fileFilter: villaImageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // Batas ukuran file lebih besar untuk gambar villa, misal 10MB
});
// --- Akhir Konfigurasi Multer ---

// Rute dasar (untuk testing)
app.get("/", (req, res) => {
  res.send("API Villa Booking Berjalan!");
});

// Gunakan rute autentikasi
app.use("/api/auth", authRoutes);

// Gunakan rute pengguna
app.use("/api/users", userRoutes);

// Gunakan rute villa - Meneruskan instance Multer untuk gambar villa
app.use("/api/villas", villaRoutes(uploadVillaImages)); // <-- UBAH INI

// Gunakan rute pemesanan - Meneruskan instance Multer untuk bukti pembayaran
app.use("/api/bookings", bookingRoutes(uploadPayment)); // <-- TETAP INI

// Middleware penanganan error global
app.use(errorHandler);

// Sinkronisasi database dan mulai server
db.sequelize
  .sync({ force: false })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server berjalan di port ${PORT}`);
      console.log("Database terhubung dan disinkronkan!");
    });
  })
  .catch((err) => {
    console.error("Gagal terhubung atau sinkronisasi database:", err);
  });
