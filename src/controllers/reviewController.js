// src/controllers/reviewController.js
import { pool } from "../config/db.js";

export const createReview = async (req, res) => {
  const { villaId, rating, comment } = req.body;
  const userId = req.user.id;

  if (!villaId || !rating) {
    return res
      .status(400)
      .json({ message: "Villa ID and rating are required." });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5." });
  }

  try {
    const [existingReview] = await pool.execute(
      "SELECT id FROM reviews WHERE villa_id = ? AND user_id = ?",
      [villaId, userId]
    );
    if (existingReview.length > 0) {
      return res
        .status(409)
        .json({ message: "You have already reviewed this villa." });
    }

    const [result] = await pool.execute(
      "INSERT INTO reviews (villa_id, user_id, rating, comment) VALUES (?, ?, ?, ?)",
      [villaId, userId, rating, comment]
    );
    res
      .status(201)
      .json({
        message: "Review added successfully!",
        reviewId: result.insertId,
      });
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json({ message: "Server error adding review." });
  }
};

export const getVillaReviews = async (req, res) => {
  const { villaId } = req.params;
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.villa_id = ? ORDER BY r.created_at DESC`,
      [villaId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching villa reviews:", error);
    res.status(500).json({ message: "Server error fetching reviews." });
  }
};

export const deleteReview = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.role === "owner") {
      const [reviewDetails] = await pool.execute(
        "SELECT r.user_id, v.owner_id FROM reviews r JOIN villas v ON r.villa_id = v.id WHERE r.id = ?",
        [id]
      );
      if (!reviewDetails[0] || reviewDetails[0].owner_id !== req.user.id) {
        return res.sendStatus(403);
      }
    }
    const [result] = await pool.execute("DELETE FROM reviews WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Review not found." });
    }
    res.json({ message: "Review deleted successfully!" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ message: "Server error deleting review." });
  }
};
