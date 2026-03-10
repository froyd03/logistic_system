const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vehicle = sequelize.define('Vehicle', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  plate_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  type: {
    type: DataTypes.ENUM('sedan', 'suv', 'van', 'bus', 'truck', 'motorcycle'),
    allowNull: false
  },
  brand: { type: DataTypes.STRING(50) },
  model: { type: DataTypes.STRING(50) },
  year: { type: DataTypes.INTEGER },
  color: { type: DataTypes.STRING(30) },
  fuel_type: {
    type: DataTypes.ENUM('gasoline', 'diesel', 'electric', 'hybrid', 'lpg'),
    allowNull: false
  },
  capacity: { type: DataTypes.INTEGER, allowNull: false, comment: 'Passenger or cargo capacity' },
  capacity_unit: { type: DataTypes.ENUM('persons', 'kg', 'liters'), defaultValue: 'persons' },
  status: {
    type: DataTypes.ENUM('available', 'reserved', 'in_transit', 'maintenance', 'inactive'),
    defaultValue: 'available'
  },
  odometer_km: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  registration_number: { type: DataTypes.STRING(50) },
  registration_expiry: { type: DataTypes.DATEONLY },
  insurance_number: { type: DataTypes.STRING(50) },
  insurance_expiry: { type: DataTypes.DATEONLY },
  purchase_date: { type: DataTypes.DATEONLY },
  purchase_price: { type: DataTypes.DECIMAL(12, 2) },
  notes: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  photo: { type: DataTypes.STRING(255) }
}, {
  tableName: 'vehicles',
  paranoid: true
});

module.exports = Vehicle;
