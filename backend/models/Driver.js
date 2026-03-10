const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Driver = sequelize.define('Driver', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  employee_id: { type: DataTypes.STRING(30), unique: true },
  license_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  license_type: { type: DataTypes.STRING(20), allowNull: false, comment: 'A, B, C, D, etc.' },
  license_expiry: { type: DataTypes.DATEONLY, allowNull: false },
  status: {
    type: DataTypes.ENUM('available', 'on_trip', 'off_duty', 'suspended', 'inactive'),
    defaultValue: 'available'
  },
  phone: { type: DataTypes.STRING(20) },
  emergency_contact: { type: DataTypes.STRING(100) },
  emergency_phone: { type: DataTypes.STRING(20) },
  address: { type: DataTypes.TEXT },
  date_hired: { type: DataTypes.DATEONLY },
  total_trips: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_km: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 5.00 },
  rating_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  notes: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  photo: { type: DataTypes.STRING(255) }
}, {
  tableName: 'drivers',
  paranoid: true
});

module.exports = Driver;
