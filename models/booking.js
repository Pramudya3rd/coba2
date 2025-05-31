const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Booking = sequelize.define("Booking", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Users", // Nama tabel yang direferensikan
        key: "id",
      },
    },
    villaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Villas", // Nama tabel yang direferensikan
        key: "id",
      },
    },
    checkInDate: {
      type: DataTypes.DATEONLY, // Hanya tanggal, tanpa waktu
      allowNull: false,
    },
    checkOutDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "cancelled", "completed"),
      defaultValue: "pending",
      allowNull: false,
    },
    paymentProof: {
      type: DataTypes.STRING, // URL bukti pembayaran
      allowNull: true,
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

  // Anda bisa menambahkan asosiasi di sini nanti (misal: Booking belongsTo User, Booking belongsTo Villa)
  // Ini akan didefinisikan dalam index.js model utama

  return Booking;
};
