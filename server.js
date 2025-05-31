// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { pool } from "./src/config/db.js"; // Import the pool from db.js

// Import middlewares
import {
  authenticateToken,
  authorizeRole,
} from "./src/middlewares/authMiddleware.js";

// Import routes
import authRoutes from "./src/routes/authRoutes.js";
import villaRoutes from "./src/routes/villaRoutes.js";
import bookingRoutes from "./src/routes/bookingRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import reviewRoutes from "./src/routes/reviewRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json
app.use("/uploads", express.static("uploads")); // Serve static files from 'uploads' directory

// Test DB Connection
pool
  .getConnection()
  .then((connection) => {
    console.log("Connected to MySQL database!");
    connection.release();
  })
  .catch((err) => {
    console.error("Error connecting to MySQL:", err.message);
    process.exit(1); // Exit process if database connection fails
  });

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/villas", villaRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);

// Global Error Handler (Optional but good practice)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
