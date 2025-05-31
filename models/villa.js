const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Villa = sequelize.define("Villa", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    guestCapacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pricePerNight: {
      type: DataTypes.DECIMAL(10, 2), // Contoh: 10 digit total, 2 di belakang koma
      allowNull: false,
    },
    size: {
      type: DataTypes.STRING, // e.g., "200m²"
      allowNull: true,
    },
    bedType: {
      type: DataTypes.STRING, // e.g., "King Bed", "Twin Beds"
      allowNull: true,
    },
    mainImage: {
      type: DataTypes.STRING, // URL gambar utama
      allowNull: true,
    },
    additionalImages: {
      type: DataTypes.JSON, // Menyimpan array URL gambar tambahan
      allowNull: true,
      defaultValue: [],
    },
    features: {
      type: DataTypes.JSON, // Menyimpan array fitur (e.g., ["WiFi", "Pool", "AC"])
      allowNull: true,
      defaultValue: [],
    },
    // Status verifikasi villa oleh admin
    status: {
      type: DataTypes.ENUM("pending", "verified", "rejected"),
      defaultValue: "pending",
      allowNull: false,
    },
    ownerId: {
      // Menambahkan ownerId untuk menghubungkan villa ke owner
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Users", // Nama tabel yang direferensikan
        key: "id",
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Anda bisa menambahkan asosiasi di sini nanti (misal: Villa belongsTo User)
  // Ini akan didefinisikan dalam index.js model utama

  return Villa;
};
