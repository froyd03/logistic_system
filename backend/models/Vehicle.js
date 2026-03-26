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
  capacity: { type: DataTypes.INTEGER, allowNull: false },
  capacity_unit: { type: DataTypes.ENUM('persons', 'kg', 'liters'), defaultValue: 'persons' },
  status: {
    type: DataTypes.ENUM(
      'available',            // ready to be assigned
      'reserved',             // approved reservation, not yet dispatched
      'in_transit',           // currently on a trip
      'maintenance_scheduled',// maintenance record created, not yet started
      'under_maintenance',    // maintenance actively in progress
      'inactive'              // decommissioned / archived
    ),
    defaultValue: 'available'
  },
  odometer_km: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },

  // ── Registration (Philippines LTO) ───────────────────────────────────────────
  registration_number: { type: DataTypes.STRING(50) },
  // Date the vehicle was first registered — drives all computed expiry logic
  registration_start_date: { type: DataTypes.DATEONLY },
  // Auto-computed: registration_start_date + 3 years (new vehicle), or manually overridden on renewal
  registration_expiry: { type: DataTypes.DATEONLY },

  // ── Insurance / CTPL (Philippines) ───────────────────────────────────────────
  insurance_number: { type: DataTypes.STRING(50) },
  // Auto-computed: aligned to registration month, renewed yearly
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
