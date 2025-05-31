// src/seed/seed.js
import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToP("/src/seed/seed.js");
const __dirname = path.dirname(__filename);

async function seedDatabase() {
  console.log("Starting database seeding...");
  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Drop existing tables in correct order to avoid foreign key constraints
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    await connection.query("DROP TABLE IF EXISTS reviews");
    await connection.query("DROP TABLE IF EXISTS bookings");
    await connection.query("DROP TABLE IF EXISTS villa_features");
    await connection.query("DROP TABLE IF EXISTS villas");
    await connection.query("DROP TABLE IF EXISTS users");
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("Dropped existing tables.");

    // 2. Create tables
    const createTablesSQL = `
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(50),
                password VARCHAR(255) NOT NULL,
                role ENUM('user', 'owner', 'admin') NOT NULL DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE villas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                owner_id INT,
                name VARCHAR(255) NOT NULL,
                address VARCHAR(255) NOT NULL,
                description TEXT,
                guests INT NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                area VARCHAR(50),
                bed_type VARCHAR(100),
                main_image_url VARCHAR(255),
                images JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                status ENUM('Pending', 'Verified', 'Rejected') DEFAULT 'Pending',
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE villa_features (
                id INT AUTO_INCREMENT PRIMARY KEY,
                villa_id INT NOT NULL,
                feature_name VARCHAR(255) NOT NULL,
                FOREIGN KEY (villa_id) REFERENCES villas(id) ON DELETE CASCADE,
                UNIQUE (villa_id, feature_name)
            );

            CREATE TABLE bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                villa_id INT NOT NULL,
                check_in_date DATE NOT NULL,
                check_out_date DATE NOT NULL,
                total_price DECIMAL(10, 2) NOT NULL,
                status ENUM('Booked', 'Pending', 'Cancelled') NOT NULL DEFAULT 'Pending',
                payment_proof_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (villa_id) REFERENCES villas(id) ON DELETE CASCADE
            );

            CREATE TABLE reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                villa_id INT NOT NULL,
                user_id INT NOT NULL,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (villa_id) REFERENCES villas(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `;
    await connection.query(createTablesSQL);
    console.log("Tables created successfully.");

    // 3. Seed initial data
    // Users
    const hashedPasswordAdmin = await bcrypt.hash("admin123", 10);
    const hashedPasswordOwner = await bcrypt.hash("owner123", 10);
    const hashedPasswordUser = await bcrypt.hash("user123", 10);

    await connection.execute(
      "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
      [
        "Admin User",
        "admin@example.com",
        "081111111111",
        hashedPasswordAdmin,
        "admin",
      ]
    );
    const [adminUser] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      ["admin@example.com"]
    );
    const adminId = adminUser[0].id;

    await connection.execute(
      "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
      [
        "Villa Owner",
        "owner@example.com",
        "082222222222",
        hashedPasswordOwner,
        "owner",
      ]
    );
    const [ownerUser] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      ["owner@example.com"]
    );
    const ownerId = ownerUser[0].id;

    await connection.execute(
      "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
      [
        "Regular User",
        "user@example.com",
        "083333333333",
        hashedPasswordUser,
        "user",
      ]
    );
    const [regularUser] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      ["user@example.com"]
    );
    const regularUserId = regularUser[0].id;
    console.log("Users seeded.");

    // Villas
    const villa1Images = JSON.stringify([
      "https://i.pinimg.com/73x/a8/bc/50/a8bc50298db283746524f3c82bbd9465.jpg",
      "https://i.pinimg.com/73x/79/0b/56/790b56d61da6b4b2bd1301da3385b085.jpg",
      "https://i.pinimg.com/73x/47/96/a1/4796a1d06f323c31fd2c7407c43788b9.jpg",
    ]);
    const villa2Images = JSON.stringify([
      "https://i.pinimg.com/73x/a8/bc/50/a8bc50298db283746524f3c82bbd9465.jpg",
      "https://i.pinimg.com/73x/79/0b/56/790b56d61da6b4b2bd1301da3385b085.jpg",
    ]);
    const villa3Images = JSON.stringify([
      "https://i.pinimg.com/73x/47/96/a1/4796a1d06f323c31fd2c7407c43788b9.jpg",
    ]);

    await connection.execute(
      `INSERT INTO villas (owner_id, name, address, description, guests, price, area, bed_type, main_image_url, images, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ownerId,
        "De Santika Nirwana",
        "Ubud, Bali",
        "Villa eksklusif dengan fasilitas premium dan pemandangan sawah yang menawan.",
        6,
        5000000.0,
        "24m²",
        "One King Bed",
        "https://i.pinimg.com/73x/89/c1/df/89c1dfaf3e2bf035718cf2a76a16fd38.jpg",
        villa1Images,
        "Verified",
      ]
    );
    const [villa1] = await connection.execute(
      "SELECT id FROM villas WHERE name = ?",
      ["De Santika Nirwana"]
    );
    const villa1Id = villa1[0].id;

    await connection.execute(
      `INSERT INTO villas (owner_id, name, address, description, guests, price, area, bed_type, main_image_url, images, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ownerId,
        "Grand Lavanya Hills",
        "Canggu, Bali",
        "Villa mewah dengan pemandangan bukit yang menakjubkan dan kolam renang pribadi.",
        8,
        8500000.0,
        "30m²",
        "Two King Beds",
        "https://i.pinimg.com/73x/b3/1d/ac/b31dac2e3bf41b30d84f5e454e293b13.jpg",
        villa2Images,
        "Verified",
      ]
    );
    const [villa2] = await connection.execute(
      "SELECT id FROM villas WHERE name = ?",
      ["Grand Lavanya Hills"]
    );
    const villa2Id = villa2[0].id;

    await connection.execute(
      `INSERT INTO villas (owner_id, name, address, description, guests, price, area, bed_type, main_image_url, images, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ownerId,
        "Samudra Biru Tropika",
        "Seminyak, Bali",
        "Nikmati ketenangan di villa dekat pantai dengan akses mudah ke tempat-tempat wisata.",
        4,
        4500000.0,
        "20m²",
        "One Queen Bed",
        "http://i.pinimg.com/73x/28/a8/8d/28a88d79127329f7f6cb7be2a18ad2f0.jpg",
        villa3Images,
        "Pending",
      ]
    );
    const [villa3] = await connection.execute(
      "SELECT id FROM villas WHERE name = ?",
      ["Samudra Biru Tropika"]
    );
    const villa3Id = villa3[0].id;
    console.log("Villas seeded.");

    // Villa Features
    await connection.execute(
      "INSERT INTO villa_features (villa_id, feature_name) VALUES (?, ?), (?, ?), (?, ?), (?, ?), (?, ?)",
      [
        villa1Id,
        "TV",
        villa1Id,
        "Free Wifi",
        villa1Id,
        "Air Conditioner",
        villa1Id,
        "Heater",
        villa1Id,
        "Private Bathroom",
      ]
    );
    await connection.execute(
      "INSERT INTO villa_features (villa_id, feature_name) VALUES (?, ?), (?, ?), (?, ?), (?, ?)",
      [
        villa2Id,
        "TV",
        villa2Id,
        "Free Wifi",
        villa2Id,
        "Private Pool",
        villa2Id,
        "Kitchen",
      ]
    );
    await connection.execute(
      "INSERT INTO villa_features (villa_id, feature_name) VALUES (?, ?), (?, ?)",
      [villa3Id, "TV", villa3Id, "Free Wifi"]
    );
    console.log("Villa features seeded.");

    // Bookings
    await connection.execute(
      "INSERT INTO bookings (user_id, villa_id, check_in_date, check_out_date, total_price, status) VALUES (?, ?, ?, ?, ?, ?)",
      [regularUserId, villa1Id, "2025-06-19", "2025-06-20", 5000000.0, "Booked"]
    );
    await connection.execute(
      "INSERT INTO bookings (user_id, villa_id, check_in_date, check_out_date, total_price, status) VALUES (?, ?, ?, ?, ?, ?)",
      [
        regularUserId,
        villa2Id,
        "2025-07-10",
        "2025-07-15",
        42500000.0,
        "Pending",
      ]
    );
    await connection.execute(
      "INSERT INTO bookings (user_id, villa_id, check_in_date, check_out_date, total_price, status) VALUES (?, ?, ?, ?, ?, ?)",
      [
        regularUserId,
        villa3Id,
        "2025-05-30",
        "2025-06-01",
        9000000.0,
        "Cancelled",
      ]
    );
    console.log("Bookings seeded.");

    // Reviews
    await connection.execute(
      "INSERT INTO reviews (villa_id, user_id, rating, comment) VALUES (?, ?, ?, ?)",
      [
        villa1Id,
        regularUserId,
        5,
        "Absolutely stunning villa! Loved every moment.",
      ]
    );
    await connection.execute(
      "INSERT INTO reviews (villa_id, user_id, rating, comment) VALUES (?, ?, ?, ?)",
      [villa1Id, adminId, 4, "Great location and amenities."]
    );
    console.log("Reviews seeded.");

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    if (connection) connection.release();
    process.exit(0); // Exit the process after seeding
  }
}

seedDatabase();
