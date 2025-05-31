// src/routes/villaRoutes.js
import { Router } from "express";
import {
  getAllVillas,
  getVillaById,
  createVilla,
  updateVilla,
  deleteVilla,
  getOwnerVillas,
  updateVillaStatus,
} from "../controllers/villaController.js";
import {
  authenticateToken,
  authorizeRole,
} from "../middlewares/authMiddleware.js";
import { uploadVillaImages } from "../utils/imageUpload.js";

const router = Router();

router.get("/", getAllVillas); // Public route
router.get("/:id", getVillaById); // Public route

// Protected routes
router.post(
  "/",
  authenticateToken,
  authorizeRole(["owner", "admin"]),
  uploadVillaImages.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 10 },
  ]),
  createVilla
);
router.put(
  "/:id",
  authenticateToken,
  authorizeRole(["owner", "admin"]),
  uploadVillaImages.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 10 },
  ]),
  updateVilla
);
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole(["owner", "admin"]),
  deleteVilla
);
router.get(
  "/my-villas/:ownerId",
  authenticateToken,
  authorizeRole(["owner", "admin"]),
  getOwnerVillas
); // Get villas for a specific owner
router.put(
  "/status/:id",
  authenticateToken,
  authorizeRole(["admin"]),
  updateVillaStatus
); // Admin action

export default router;
