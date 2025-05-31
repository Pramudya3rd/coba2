// src/controllers/villaController.js
import { pool } from "../config/db.js";
import { uploadVillaImages } from "../utils/imageUpload.js";

// Helper to get average rating for a villa
const getVillaRating = async (villaId) => {
  const [rows] = await pool.execute(
    "SELECT AVG(rating) as avg_rating, COUNT(id) as review_count FROM reviews WHERE villa_id = ?",
    [villaId]
  );
  return rows[0] || { avg_rating: 0, review_count: 0 };
};

export const getAllVillas = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM villas WHERE status = "Verified"'
    );
    const villasWithDetails = await Promise.all(
      rows.map(async (villa) => {
        const ratingInfo = await getVillaRating(villa.id);
        const [featuresRows] = await pool.execute(
          "SELECT feature_name FROM villa_features WHERE villa_id = ?",
          [villa.id]
        );
        const features = featuresRows.map((row) => row.feature_name);
        return {
          ...villa,
          averageRating: parseFloat(ratingInfo.avg_rating || 0).toFixed(1),
          reviewCount: ratingInfo.review_count,
          features: features,
          images: JSON.parse(villa.images || "[]"), // Assuming images are stored as JSON array of URLs
        };
      })
    );
    res.json(villasWithDetails);
  } catch (error) {
    console.error("Error fetching villas:", error);
    res.status(500).json({ message: "Server error fetching villas." });
  }
};

export const getVillaById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute("SELECT * FROM villas WHERE id = ?", [
      id,
    ]);
    const villa = rows[0];

    if (!villa) {
      return res.status(404).json({ message: "Villa not found." });
    }

    const ratingInfo = await getVillaRating(villa.id);
    const [featuresRows] = await pool.execute(
      "SELECT feature_name FROM villa_features WHERE villa_id = ?",
      [villa.id]
    );
    const features = featuresRows.map((row) => row.feature_name);

    res.json({
      ...villa,
      averageRating: parseFloat(ratingInfo.avg_rating || 0).toFixed(1),
      reviewCount: ratingInfo.review_count,
      features: features,
      images: JSON.parse(villa.images || "[]"),
    });
  } catch (error) {
    console.error("Error fetching villa by ID:", error);
    res.status(500).json({ message: "Server error fetching villa." });
  }
};

export const createVilla = async (req, res) => {
  const { name, address, description, guests, price, area, bedType, features } =
    req.body;
  const mainImageFile =
    req.files && req.files["mainImage"] ? req.files["mainImage"][0] : null;
  const additionalImageFiles =
    req.files && req.files["additionalImages"]
      ? req.files["additionalImages"]
      : [];

  if (
    !name ||
    !address ||
    !description ||
    !guests ||
    !price ||
    !area ||
    !bedType ||
    !mainImageFile
  ) {
    return res
      .status(400)
      .json({ message: "All required fields and a main image are needed." });
  }

  const mainImageUrl = mainImageFile
    ? `/uploads/villas/${mainImageFile.filename}`
    : null;
  const additionalImageUrls = additionalImageFiles.map(
    (file) => `/uploads/villas/${file.filename}`
  );

  try {
    const [result] = await pool.execute(
      "INSERT INTO villas (owner_id, name, address, description, guests, price, area, bed_type, main_image_url, images, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        req.user.id,
        name,
        address,
        description,
        guests,
        price,
        area,
        bedType,
        mainImageUrl,
        JSON.stringify(additionalImageUrls),
        "Pending",
      ]
    );
    const villaId = result.insertId;

    if (features && Array.isArray(JSON.parse(features))) {
      const parsedFeatures = JSON.parse(features);
      for (const feature of parsedFeatures) {
        await pool.execute(
          "INSERT INTO villa_features (villa_id, feature_name) VALUES (?, ?)",
          [villaId, feature]
        );
      }
    }
    res.status(201).json({
      message: "Villa added successfully and is pending approval!",
      villaId: villaId,
    });
  } catch (error) {
    console.error("Error adding villa:", error);
    res.status(500).json({ message: "Server error adding villa." });
  }
};

export const updateVilla = async (req, res) => {
  const { id } = req.params;
  const { name, address, description, guests, price, area, bedType, features } =
    req.body;
  const mainImageFile =
    req.files && req.files["mainImage"] ? req.files["mainImage"][0] : null;
  const additionalImageFiles =
    req.files && req.files["additionalImages"]
      ? req.files["additionalImages"]
      : [];

  try {
    // Fetch current villa data to get existing images
    const [currentVillaRows] = await pool.execute(
      "SELECT owner_id, main_image_url, images FROM villas WHERE id = ?",
      [id]
    );
    const currentVilla = currentVillaRows[0];

    if (!currentVilla) {
      return res.status(404).json({ message: "Villa not found." });
    }

    // Check if the current user is the owner or an admin
    if (req.user.role === "owner" && currentVilla.owner_id !== req.user.id) {
      return res.sendStatus(403); // Forbidden
    }

    let mainImageUrl = currentVilla.main_image_url;
    if (mainImageFile) {
      mainImageUrl = `/uploads/villas/${mainImageFile.filename}`;
    }

    // Handle additional images: frontend needs to send existing URLs to keep them
    let existingAdditionalImages = JSON.parse(currentVilla.images || "[]");
    // Filter out any images that were removed by the frontend (if applicable, not in current FE)
    // For simplicity here, we assume frontend sends ALL desired images, both old and new.
    // If frontend sends only *new* additional images, you'd need to append.
    // Let's assume the frontend sends a `keepImages` array of URLs for existing ones.
    const imagesToKeep = req.body.keepImages
      ? JSON.parse(req.body.keepImages)
      : [];
    const newAdditionalImageUrls = additionalImageFiles.map(
      (file) => `/uploads/villas/${file.filename}`
    );
    const combinedAdditionalImages = [
      ...imagesToKeep,
      ...newAdditionalImageUrls,
    ];

    await pool.execute(
      "UPDATE villas SET name = ?, address = ?, description = ?, guests = ?, price = ?, area = ?, bed_type = ?, main_image_url = ?, images = ? WHERE id = ?",
      [
        name,
        address,
        description,
        guests,
        price,
        area,
        bedType,
        mainImageUrl,
        JSON.stringify(combinedAdditionalImages),
        id,
      ]
    );

    // Update features
    await pool.execute("DELETE FROM villa_features WHERE villa_id = ?", [id]);
    if (features && Array.isArray(JSON.parse(features))) {
      const parsedFeatures = JSON.parse(features);
      for (const feature of parsedFeatures) {
        await pool.execute(
          "INSERT INTO villa_features (villa_id, feature_name) VALUES (?, ?)",
          [id, feature]
        );
      }
    }

    res.json({ message: "Villa updated successfully!" });
  } catch (error) {
    console.error("Error updating villa:", error);
    res.status(500).json({ message: "Server error updating villa." });
  }
};

export const deleteVilla = async (req, res) => {
  const { id } = req.params;
  try {
    const [currentVillaRows] = await pool.execute(
      "SELECT owner_id FROM villas WHERE id = ?",
      [id]
    );
    const currentVilla = currentVillaRows[0];

    if (!currentVilla) {
      return res.status(404).json({ message: "Villa not found." });
    }

    if (req.user.role === "owner" && currentVilla.owner_id !== req.user.id) {
      return res.sendStatus(403); // Forbidden
    }

    // Start a transaction for cascading deletes
    await pool.beginTransaction();
    await pool.execute("DELETE FROM villa_features WHERE villa_id = ?", [id]);
    await pool.execute("DELETE FROM reviews WHERE villa_id = ?", [id]);
    await pool.execute("DELETE FROM bookings WHERE villa_id = ?", [id]);
    await pool.execute("DELETE FROM villas WHERE id = ?", [id]);
    await pool.commit();

    res.json({ message: "Villa deleted successfully!" });
  } catch (error) {
    await pool.rollback();
    console.error("Error deleting villa:", error);
    res.status(500).json({ message: "Server error deleting villa." });
  }
};

export const getOwnerVillas = async (req, res) => {
  const { ownerId } = req.params;
  if (req.user.role === "owner" && req.user.id !== parseInt(ownerId)) {
    return res.sendStatus(403); // Owner can only view their own villas
  }
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, address, status FROM villas WHERE owner_id = ?",
      [ownerId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching owner villas:", error);
    res.status(500).json({ message: "Server error fetching owner villas." });
  }
};

export const updateVillaStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Verified', 'Rejected', 'Pending'

  if (!["Verified", "Rejected", "Pending"].includes(status)) {
    return res.status(400).json({ message: "Invalid status provided." });
  }

  try {
    const [result] = await pool.execute(
      "UPDATE villas SET status = ? WHERE id = ?",
      [status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Villa not found." });
    }
    res.json({ message: `Villa status updated to ${status} successfully!` });
  } catch (error) {
    console.error("Error updating villa status:", error);
    res.status(500).json({ message: "Server error updating villa status." });
  }
};
