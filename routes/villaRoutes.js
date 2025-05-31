// routes/villaRoutes.js
const express = require("express");
const villaController = require("../controllers/villaController");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// UBAH module.exports menjadi fungsi yang menerima 'uploadVillaImages'
module.exports = (uploadVillaImages) => {
  // <-- UBAH INI
  const router = express.Router();

  // Rute untuk menambah villa baru (Hanya Owner)
  // uploadVillaImages.fields([]) untuk menerima multiple fields (mainImage dan additionalImages)
  router.post(
    "/",
    authenticateToken,
    authorizeRoles("owner"),
    uploadVillaImages.fields([
      // <-- TAMBAHKAN MIDDLEWARE UPLOAD MULTER DI SINI
      { name: "mainImage", maxCount: 1 },
      { name: "additionalImages", maxCount: 10 },
    ]),
    villaController.createVilla
  );

  // Rute untuk memperbarui villa (Hanya Owner yang memiliki villa tersebut)
  router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("owner"),
    uploadVillaImages.fields([
      // <-- TAMBAHKAN MIDDLEWARE UPLOAD MULTER DI SINI
      { name: "mainImage", maxCount: 1 },
      { name: "additionalImages", maxCount: 10 },
    ]),
    villaController.updateVilla
  );

  // Rute lainnya tetap sama (tidak perlu Multer karena tidak ada upload file)
  router.get("/", authenticateToken, villaController.getAllVillas);

  router.get("/:id", authenticateToken, villaController.getVillaById);

  router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("owner", "admin"),
    villaController.deleteVilla
  );

  router.put(
    "/:id/status",
    authenticateToken,
    authorizeRoles("admin"),
    villaController.updateVillaStatus
  );

  return router;
};
