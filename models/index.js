const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const process = require("process");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.js")[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

// Tambahkan baris ini untuk mendapatkan DataTypes dari Sequelize
const { DataTypes } = Sequelize;

fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes); // DataTypes kini tersedia
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// --- Definisikan Asosiasi Secara Eksplisit ---
// User memiliki banyak Villa
db.User.hasMany(db.Villa, {
  foreignKey: "ownerId",
  as: "villas", // Alias untuk hubungan
  onDelete: "CASCADE", // Jika User dihapus, Villa juga dihapus
});

// Villa dimiliki oleh satu User (owner)
db.Villa.belongsTo(db.User, {
  foreignKey: "ownerId",
  as: "owner",
});

// User memiliki banyak Booking
db.User.hasMany(db.Booking, {
  foreignKey: "userId",
  as: "bookings",
  onDelete: "CASCADE", // Jika User dihapus, Booking juga dihapus
});

// Villa memiliki banyak Booking
db.Villa.hasMany(db.Booking, {
  foreignKey: "villaId",
  as: "bookings",
  onDelete: "CASCADE", // Jika Villa dihapus, Booking juga dihapus
});

// Booking dimiliki oleh satu User
db.Booking.belongsTo(db.User, {
  foreignKey: "userId",
  as: "user",
});

// Booking terkait dengan satu Villa
db.Booking.belongsTo(db.Villa, {
  foreignKey: "villaId",
  as: "villa",
});
// --- Akhir Definisi Asosiasi Eksplisit ---

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
