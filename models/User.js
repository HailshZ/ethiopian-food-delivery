// models/User.js – Sequelize User model
const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      set(value) {
        this.setDataValue('email', value ? value.toLowerCase().trim() : null);
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    addressStreet: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    addressCity: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    addressZipCode: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'superadmin', 'provider'),
      defaultValue: 'user'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    restaurantName: {
      type: DataTypes.STRING,
      defaultValue: ''
    }
  }, {
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  User.prototype.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  // Helper to return user data without password
  User.prototype.toSafeJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  return User;
};