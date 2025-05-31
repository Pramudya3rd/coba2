// src/routes/userRoutes.js
import { Router } from "express";
import {
  getUserProfile,
  getAllUsers,
  getAllOwners,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import {
  authenticateToken,
  authorizeRole,
} from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/:id", authenticateToken, getUserProfile); // Get a single user's profile
router.get(
  "/all/users",
  authenticateToken,
  authorizeRole(["admin"]),
  getAllUsers
); // Get all users (Admin only)
router.get(
  "/all/owners",
  authenticateToken,
  authorizeRole(["admin"]),
  getAllOwners
); // Get all owners (Admin only)
router.put("/:id", authenticateToken, authorizeRole(["admin"]), updateUser); // Update a user (Admin only)
router.delete("/:id", authenticateToken, authorizeRole(["admin"]), deleteUser); // Delete a user (Admin only)

export default router;
