module.exports = (sequelize, DataTypes) => {
  const Contact = sequelize.define(
    "Contact",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      persons: {
        type: DataTypes.STRING,
      },
      date: {
        type: DataTypes.DATE,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: "contacts",
      timestamps: true,
    }
  );

  return Contact;
};
