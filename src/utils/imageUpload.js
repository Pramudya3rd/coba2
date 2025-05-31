// src/utils/imageUpload.js
import multer from "multer";
import fs from "fs";
import path from "path"; // Add this import
import { fileURLToPath } from "url"; // Add this import

// Define __filename and __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const createUploadDirs = () => {
  const uploadsBaseDir = path.join(__dirname, "../../uploads"); // Path to the 'uploads' folder at the project root
  const villaDir = path.join(uploadsBaseDir, "villas");
  const paymentDir = path.join(uploadsBaseDir, "payments");

  if (!fs.existsSync(villaDir)) {
    fs.mkdirSync(villaDir, { recursive: true });
  }
  if (!fs.existsSync(paymentDir)) {
    fs.mkdirSync(paymentDir, { recursive: true });
  }
};
createUploadDirs();

// Multer storage for villa images
const villaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure path is relative to the project root 'uploads/villas'
    cb(null, path.join(__dirname, "../../uploads/villas/"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Multer storage for payment proofs
const paymentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure path is relative to the project root 'uploads/payments'
    cb(null, path.join(__dirname, "../../uploads/payments/"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

export const uploadVillaImages = multer({ storage: villaStorage });
export const uploadPaymentProof = multer({ storage: paymentStorage });
