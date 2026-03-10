const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reservation = sequelize.define('Reservation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  reservation_code: { type: DataTypes.STRING(20), unique: true },
  requester_id: { type: DataTypes.UUID, allowNull: false },
  vehicle_id: { type: DataTypes.UUID },
  driver_id: { type: DataTypes.UUID },
  purpose: {
    type: DataTypes.ENUM('guest_transport', 'supplier_pickup', 'catering_delivery', 'staff_shuttle', 'other'),
    allowNull: false
  },
  description: { type: DataTypes.TEXT },
  pickup_location: { type: DataTypes.STRING(255), allowNull: false },
  dropoff_location: { type: DataTypes.STRING(255), allowNull: false },
  scheduled_start: { type: DataTypes.DATE, allowNull: false },
  scheduled_end: { type: DataTypes.DATE, allowNull: false },
  passenger_count: { type: DataTypes.INTEGER, defaultValue: 1 },
  priority: { type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'), defaultValue: 'normal' },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'dispatched', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  approved_by: { type: DataTypes.UUID },
  approved_at: { type: DataTypes.DATE },
  rejection_reason: { type: DataTypes.TEXT },
  cancellation_reason: { type: DataTypes.TEXT },
  notes: { type: DataTypes.TEXT },
  estimated_cost: { type: DataTypes.DECIMAL(10, 2) }
}, {
  tableName: 'reservations',
  paranoid: true,
  hooks: {
    beforeCreate: async (reservation) => {
      const count = await Reservation.count();
      reservation.reservation_code = `RES-${String(count + 1).padStart(6, '0')}`;
    }
  }
});

module.exports = Reservation;
