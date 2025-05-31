// src/controllers/userController.js
import { pool } from "../config/db.js";

export const getUserProfile = async (req, res) => {
  const { id } = req.params;

  if (req.user.role === "user" && req.user.id !== parseInt(id)) {
    return res.sendStatus(403);
  }

  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email, phone, role FROM users WHERE id = ?",
      [id]
    );
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error fetching user profile." });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, phone, role FROM users WHERE role = "user"'
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ message: "Server error fetching users." });
  }
};

export const getAllOwners = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, phone FROM users WHERE role = "owner"'
    );
    const ownersWithVillaCount = await Promise.all(
      rows.map(async (owner) => {
        const [villaCountRows] = await pool.execute(
          "SELECT COUNT(*) as villa_count FROM villas WHERE owner_id = ?",
          [owner.id]
        );
        return {
          ...owner,
          villa_count: villaCountRows[0].villa_count,
        };
      })
    );
    res.json(ownersWithVillaCount);
  } catch (error) {
    console.error("Error fetching all owners:", error);
    res.status(500).json({ message: "Server error fetching owners." });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, role } = req.body;

  try {
    const [result] = await pool.execute(
      "UPDATE users SET name = ?, email = ?, phone = ?, role = ? WHERE id = ?",
      [name, email, phone, role, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json({ message: "User updated successfully!" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error updating user." });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.beginTransaction();

    // Delete related records first
    await pool.execute("DELETE FROM bookings WHERE user_id = ?", [id]);
    await pool.execute("DELETE FROM reviews WHERE user_id = ?", [id]);

    // If deleting an owner, set their villas to NULL owner_id
    await pool.execute("UPDATE villas SET owner_id = NULL WHERE owner_id = ?", [
      id,
    ]);

    await pool.execute("DELETE FROM users WHERE id = ?", [id]);
    await pool.commit();

    res.json({ message: "User deleted successfully!" });
  } catch (error) {
    await pool.rollback();
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error deleting user." });
  }
};
