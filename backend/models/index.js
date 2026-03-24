const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ─── VehicleMaintenance ───────────────────────────────────────────────────────
const VehicleMaintenance = sequelize.define('VehicleMaintenance', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  vehicle_id: { type: DataTypes.UUID, allowNull: false },
  maintenance_type: { type: DataTypes.ENUM('preventive', 'corrective', 'emergency', 'inspection'), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  provider: { type: DataTypes.STRING(100) },
  cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  odometer_at_service: { type: DataTypes.DECIMAL(10, 2) },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY },
  next_service_date: { type: DataTypes.DATEONLY },
  next_service_km: { type: DataTypes.DECIMAL(10, 2) },
  status: { type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'), defaultValue: 'scheduled' },
  notes: { type: DataTypes.TEXT },
  performed_by: { type: DataTypes.UUID },
  completed_at: { type: DataTypes.DATE }        // set when status → completed
}, { tableName: 'vehicle_maintenance', paranoid: true });

// ─── VehicleDocument ─────────────────────────────────────────────────────────
const VehicleDocument = sequelize.define('VehicleDocument', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  vehicle_id: { type: DataTypes.UUID, allowNull: false },
  document_type: { type: DataTypes.STRING(50), allowNull: false },
  document_name: { type: DataTypes.STRING(150), allowNull: false },
  file_path: { type: DataTypes.STRING(255), allowNull: false },
  expiry_date: { type: DataTypes.DATEONLY },
  uploaded_by: { type: DataTypes.UUID },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'vehicle_documents', paranoid: true });

// ─── VehicleStatusHistory ────────────────────────────────────────────────────
const VehicleStatusHistory = sequelize.define('VehicleStatusHistory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  vehicle_id: { type: DataTypes.UUID, allowNull: false },
  from_status: { type: DataTypes.STRING(30) },
  to_status: { type: DataTypes.STRING(30), allowNull: false },
  changed_by: { type: DataTypes.UUID },
  reason: { type: DataTypes.TEXT }
}, { tableName: 'vehicle_status_history' });

// ─── DispatchRecord ──────────────────────────────────────────────────────────
const DispatchRecord = sequelize.define('DispatchRecord', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  reservation_id: { type: DataTypes.UUID, allowNull: false },
  vehicle_id: { type: DataTypes.UUID, allowNull: false },
  driver_id: { type: DataTypes.UUID, allowNull: false },
  dispatched_by: { type: DataTypes.UUID, allowNull: false },
  dispatched_at: { type: DataTypes.DATE, allowNull: false },
  actual_start: { type: DataTypes.DATE },
  actual_end: { type: DataTypes.DATE },
  odometer_start: { type: DataTypes.DECIMAL(10, 2) },
  odometer_end: { type: DataTypes.DECIMAL(10, 2) },
  fuel_start: { type: DataTypes.DECIMAL(6, 2) },
  fuel_end: { type: DataTypes.DECIMAL(6, 2) },
  fuel_consumed: { type: DataTypes.DECIMAL(6, 2) },
  distance_km: { type: DataTypes.DECIMAL(10, 2) },
  status: { type: DataTypes.ENUM('dispatched', 'in_progress', 'completed', 'cancelled'), defaultValue: 'dispatched' },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'dispatch_records', paranoid: true });

// ─── TripLog ─────────────────────────────────────────────────────────────────
const TripLog = sequelize.define('TripLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  dispatch_id: { type: DataTypes.UUID, allowNull: false },
  reservation_id: { type: DataTypes.UUID, allowNull: false },
  driver_id: { type: DataTypes.UUID, allowNull: false },
  vehicle_id: { type: DataTypes.UUID, allowNull: false },
  trip_date: { type: DataTypes.DATEONLY, allowNull: false },
  scheduled_start: { type: DataTypes.DATE },
  scheduled_end: { type: DataTypes.DATE },
  actual_start: { type: DataTypes.DATE },
  actual_end: { type: DataTypes.DATE },
  delay_minutes: { type: DataTypes.INTEGER, defaultValue: 0 },
  distance_km: { type: DataTypes.DECIMAL(10, 2) },
  duration_minutes: { type: DataTypes.INTEGER },
  fuel_consumed: { type: DataTypes.DECIMAL(6, 2) },
  fuel_cost: { type: DataTypes.DECIMAL(10, 2) },
  driver_rating: { type: DataTypes.DECIMAL(3, 2) },
  rating_comment: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('in_progress', 'completed', 'cancelled'), defaultValue: 'in_progress' },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'trip_logs', paranoid: true });

// ─── DriverPerformance ────────────────────────────────────────────────────────
const DriverPerformance = sequelize.define('DriverPerformance', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  driver_id: { type: DataTypes.UUID, allowNull: false },
  period_month: { type: DataTypes.INTEGER, allowNull: false },
  period_year: { type: DataTypes.INTEGER, allowNull: false },
  total_trips: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_km: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total_fuel_consumed: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total_delay_minutes: { type: DataTypes.INTEGER, defaultValue: 0 },
  average_rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
  on_time_percentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  incidents: { type: DataTypes.INTEGER, defaultValue: 0 },
  penalties: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'driver_performance' });

// ─── DriverIncident ───────────────────────────────────────────────────────────
const DriverIncident = sequelize.define('DriverIncident', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  driver_id: { type: DataTypes.UUID, allowNull: false },
  trip_log_id: { type: DataTypes.UUID },
  incident_type: { type: DataTypes.ENUM('accident', 'traffic_violation', 'misconduct', 'vehicle_damage', 'other'), allowNull: false },
  severity: { type: DataTypes.ENUM('minor', 'moderate', 'major', 'critical'), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  incident_date: { type: DataTypes.DATE, allowNull: false },
  location: { type: DataTypes.STRING(255) },
  reported_by: { type: DataTypes.UUID },
  action_taken: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('reported', 'investigating', 'resolved', 'closed'), defaultValue: 'reported' }
}, { tableName: 'driver_incidents', paranoid: true });

// ─── TransportExpense ─────────────────────────────────────────────────────────
const TransportExpense = sequelize.define('TransportExpense', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  vehicle_id: { type: DataTypes.UUID },
  driver_id: { type: DataTypes.UUID },
  trip_log_id: { type: DataTypes.UUID },
  expense_type: { type: DataTypes.ENUM('fuel', 'maintenance', 'toll', 'parking', 'insurance', 'registration', 'other'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), defaultValue: 'PHP' },
  expense_date: { type: DataTypes.DATEONLY, allowNull: false },
  description: { type: DataTypes.TEXT },
  receipt_path: { type: DataTypes.STRING(255) },
  recorded_by: { type: DataTypes.UUID },
  approved_by: { type: DataTypes.UUID }
}, { tableName: 'transport_expenses', paranoid: true });

// ─── FuelLog ──────────────────────────────────────────────────────────────────
const FuelLog = sequelize.define('FuelLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  vehicle_id: { type: DataTypes.UUID, allowNull: true },   // FIX: was allowNull: false — form doesn't always have vehicle
  driver_id: { type: DataTypes.UUID },
  trip_log_id: { type: DataTypes.UUID },
  fuel_date: { type: DataTypes.DATE, allowNull: false },
  liters: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  price_per_liter: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  total_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  odometer_reading: { type: DataTypes.DECIMAL(10, 2) },
  station_name: { type: DataTypes.STRING(100) },
  recorded_by: { type: DataTypes.UUID }
}, { tableName: 'fuel_logs', paranoid: true });

// ─── AuditLog ────────────────────────────────────────────────────────────────
const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID },
  action: { type: DataTypes.STRING(50), allowNull: false },
  entity: { type: DataTypes.STRING(50), allowNull: false },
  entity_id: { type: DataTypes.STRING(50) },
  old_values: { type: DataTypes.JSON },
  new_values: { type: DataTypes.JSON },
  ip_address: { type: DataTypes.STRING(45) },
  user_agent: { type: DataTypes.TEXT }
}, { tableName: 'audit_logs', updatedAt: false });

module.exports = {
  VehicleMaintenance,
  VehicleDocument,
  VehicleStatusHistory,
  DispatchRecord,
  TripLog,
  DriverPerformance,
  DriverIncident,
  TransportExpense,
  FuelLog,
  AuditLog
};
