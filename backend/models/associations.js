const sequelize = require('../config/database');
const User = require('./User');
const Vehicle = require('./Vehicle');
const Driver = require('./Driver');
const Reservation = require('./Reservation');
const {
  VehicleMaintenance, VehicleDocument, VehicleStatusHistory,
  DispatchRecord, TripLog, DriverPerformance, DriverIncident,
  TransportExpense, FuelLog, AuditLog
} = require('./index');

// User → Driver
User.hasOne(Driver, { foreignKey: 'user_id', as: 'driverProfile' });
Driver.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Vehicle → Maintenance
Vehicle.hasMany(VehicleMaintenance, { foreignKey: 'vehicle_id', as: 'maintenanceLogs' });
VehicleMaintenance.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
VehicleMaintenance.belongsTo(User, { foreignKey: 'performed_by', as: 'technician' });

// Vehicle → Documents
Vehicle.hasMany(VehicleDocument, { foreignKey: 'vehicle_id', as: 'documents' });
VehicleDocument.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
VehicleDocument.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// Vehicle → Status History
Vehicle.hasMany(VehicleStatusHistory, { foreignKey: 'vehicle_id', as: 'statusHistory' });
VehicleStatusHistory.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
VehicleStatusHistory.belongsTo(User, { foreignKey: 'changed_by', as: 'changedBy' });

// Reservation associations
Reservation.belongsTo(User, { foreignKey: 'requester_id', as: 'requester' });
Reservation.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });
Reservation.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
Reservation.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });
User.hasMany(Reservation, { foreignKey: 'requester_id', as: 'reservations' });

// Dispatch
DispatchRecord.belongsTo(Reservation, { foreignKey: 'reservation_id', as: 'reservation' });
DispatchRecord.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
DispatchRecord.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });
DispatchRecord.belongsTo(User, { foreignKey: 'dispatched_by', as: 'dispatcher' });
Reservation.hasOne(DispatchRecord, { foreignKey: 'reservation_id', as: 'dispatch' });

// TripLog
TripLog.belongsTo(DispatchRecord, { foreignKey: 'dispatch_id', as: 'dispatch' });
DispatchRecord.hasOne(TripLog, { foreignKey: 'dispatch_id', as: 'tripLog' }); // FIX: needed for eager loading
TripLog.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });
TripLog.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
TripLog.belongsTo(Reservation, { foreignKey: 'reservation_id', as: 'reservation' });
Driver.hasMany(TripLog, { foreignKey: 'driver_id', as: 'tripLogs' });
Vehicle.hasMany(TripLog, { foreignKey: 'vehicle_id', as: 'tripLogs' });

// Driver Performance & Incidents
Driver.hasMany(DriverPerformance, { foreignKey: 'driver_id', as: 'performanceLogs' });
DriverPerformance.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });
Driver.hasMany(DriverIncident, { foreignKey: 'driver_id', as: 'incidents' });
DriverIncident.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });
DriverIncident.belongsTo(TripLog, { foreignKey: 'trip_log_id', as: 'tripLog' });
DriverIncident.belongsTo(User, { foreignKey: 'reported_by', as: 'reporter' });

// Expenses & Fuel
TransportExpense.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
TransportExpense.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });
TransportExpense.belongsTo(TripLog, { foreignKey: 'trip_log_id', as: 'tripLog' });
TransportExpense.belongsTo(User, { foreignKey: 'recorded_by', as: 'recorder' });
Vehicle.hasMany(TransportExpense, { foreignKey: 'vehicle_id', as: 'expenses' });

FuelLog.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
FuelLog.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });
FuelLog.belongsTo(TripLog, { foreignKey: 'trip_log_id', as: 'tripLog' });
FuelLog.belongsTo(User, { foreignKey: 'recorded_by', as: 'recorder' });
Vehicle.hasMany(FuelLog, { foreignKey: 'vehicle_id', as: 'fuelLogs' });

// Audit Log
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User, Vehicle, Driver, Reservation,
  VehicleMaintenance, VehicleDocument, VehicleStatusHistory,
  DispatchRecord, TripLog, DriverPerformance, DriverIncident,
  TransportExpense, FuelLog, AuditLog
};
