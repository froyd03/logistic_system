const { Op } = require('sequelize');
const Vehicle = require('../models/Vehicle');
const { VehicleMaintenance, VehicleDocument, VehicleStatusHistory, TripLog } = require('../models/index');
const { sequelize } = require('../models/associations');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { validationResult } = require('express-validator');
const { computeExpiryDates, alignInsuranceToRegistration, getRegistrationStatus } = require('../utils/vehicleDates');
const {
  STATUSES,
  assertTransition,
  assertMaintenanceSchedulable,
  assertMaintenanceStartable,
} = require('../utils/vehicleStatus');

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL
// ─────────────────────────────────────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, type, search, fuel_type } = req.query;
    const offset = (page - 1) * limit;
    const where = { is_active: true };

    if (status) where.status = status;
    if (type) where.type = type;
    if (fuel_type) where.fuel_type = fuel_type;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { plate_number: { [Op.like]: `%${search}%` } },
        { brand: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Vehicle.findAndCountAll({
      where, limit: parseInt(limit), offset, order: [['created_at', 'DESC']]
    });

    const data = rows.map(v => ({
      ...v.toJSON(),
      registration_status: getRegistrationStatus(v.registration_expiry)
    }));

    return paginatedResponse(res, data, count, page, limit, 'Vehicles retrieved');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id, {
      include: [
        { model: VehicleMaintenance, as: 'maintenanceLogs', limit: 10, order: [['created_at', 'DESC']] },
        { model: VehicleDocument, as: 'documents' }
      ]
    });
    if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);
    return successResponse(res, {
      ...vehicle.toJSON(),
      registration_status: getRegistrationStatus(vehicle.registration_expiry)
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

    const payload = { ...req.body };
    if (payload.registration_start_date && !payload.registration_expiry) {
      const computed = computeExpiryDates(payload.registration_start_date);
      payload.registration_expiry = computed.registration_expiry;
      payload.insurance_expiry    = computed.insurance_expiry;
    }
    if (payload.registration_expiry && !payload.insurance_expiry) {
      payload.insurance_expiry = alignInsuranceToRegistration(payload.registration_expiry);
    }

    const vehicle = await Vehicle.create(payload);
    await VehicleStatusHistory.create({
      vehicle_id: vehicle.id, from_status: null, to_status: vehicle.status,
      changed_by: req.user.id, reason: 'Vehicle registered into fleet'
    });

    return successResponse(res, {
      ...vehicle.toJSON(),
      registration_status: getRegistrationStatus(vehicle.registration_expiry)
    }, 'Vehicle created successfully', 201);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);

    const payload = { ...req.body };
    if (payload.registration_start_date &&
        payload.registration_start_date !== vehicle.registration_start_date) {
      const computed = computeExpiryDates(payload.registration_start_date);
      payload.registration_expiry = computed.registration_expiry;
      payload.insurance_expiry    = computed.insurance_expiry;
    }
    if (payload.registration_expiry &&
        payload.registration_expiry !== vehicle.registration_expiry &&
        !payload.insurance_expiry) {
      payload.insurance_expiry = alignInsuranceToRegistration(payload.registration_expiry);
    }

    const oldStatus = vehicle.status;
    await vehicle.update(payload);

    if (payload.status && payload.status !== oldStatus) {
      await VehicleStatusHistory.create({
        vehicle_id: vehicle.id, from_status: oldStatus, to_status: payload.status,
        changed_by: req.user.id, reason: payload.status_reason || 'Status updated manually'
      });
    }
    return successResponse(res, {
      ...vehicle.toJSON(),
      registration_status: getRegistrationStatus(vehicle.registration_expiry)
    }, 'Vehicle updated');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVE
// ─────────────────────────────────────────────────────────────────────────────
exports.archive = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);
    if (vehicle.status === STATUSES.IN_TRANSIT) {
      return errorResponse(res, `Cannot archive "${vehicle.name}" — it is currently in transit.`, 422);
    }
    if (vehicle.status === STATUSES.UNDER_MAINTENANCE) {
      return errorResponse(res, `Cannot archive "${vehicle.name}" — it is under maintenance.`, 422);
    }
    await vehicle.update({ is_active: false, status: STATUSES.INACTIVE });
    await vehicle.destroy();
    return successResponse(res, null, 'Vehicle archived');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS HISTORY
// ─────────────────────────────────────────────────────────────────────────────
exports.getStatusHistory = async (req, res, next) => {
  try {
    const history = await VehicleStatusHistory.findAll({
      where: { vehicle_id: req.params.id },
      order: [['created_at', 'DESC']],
      limit: 50
    });
    return successResponse(res, history);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADD MAINTENANCE
// ─────────────────────────────────────────────────────────────────────────────
exports.addMaintenance = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);

    // ── STATE MACHINE: only 'available' vehicles can be scheduled ────────────
    try {
      assertMaintenanceSchedulable(vehicle);
    } catch (e) {
      return errorResponse(res, e.message, 422);
    }

    const t = await sequelize.transaction();
    try {
      // Auto-capture odometer
      let latestOdometer = parseFloat(vehicle.odometer_km) || 0;
      try {
        const lastTrip = await TripLog.findOne({
          where: { vehicle_id: vehicle.id, status: 'completed' },
          order: [['actual_end', 'DESC']]
        });
        if (lastTrip?.odometer_end) {
          latestOdometer = Math.max(latestOdometer, parseFloat(lastTrip.odometer_end));
        }
      } catch (_) { /* non-fatal */ }

      const payload = {
        ...req.body,
        vehicle_id: req.params.id,
        performed_by: req.user.id,
        odometer_at_service: latestOdometer
      };

      const maintenance = await VehicleMaintenance.create(payload, { transaction: t });

      // ── Determine vehicle status based on maintenance status requested ────
      let newVehicleStatus = null;

      if (req.body.status === 'in_progress' || req.body.maintenance_type === 'emergency') {
        // Emergency or immediately-started maintenance: skip straight to under_maintenance
        newVehicleStatus = STATUSES.UNDER_MAINTENANCE;
      } else if (req.body.status === 'scheduled') {
        // Scheduled maintenance: ground the vehicle immediately
        newVehicleStatus = STATUSES.MAINTENANCE_SCHEDULED;
      }
      // 'cancelled' at creation — no status change needed

      if (newVehicleStatus) {
        const oldStatus = vehicle.status;
        await vehicle.update({ status: newVehicleStatus }, { transaction: t });
        await VehicleStatusHistory.create({
          vehicle_id: vehicle.id,
          from_status: oldStatus,
          to_status: newVehicleStatus,
          changed_by: req.user.id,
          reason: `Maintenance (${req.body.maintenance_type}): ${req.body.description?.substring(0, 80)}`
        }, { transaction: t });
      }

      await t.commit();
      return successResponse(res, {
        ...maintenance.toJSON(),
        odometer_captured: latestOdometer,
        vehicle_status_set_to: newVehicleStatus || vehicle.status
      }, 'Maintenance record added', 201);
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE MAINTENANCE
// Sets vehicle back to 'available'. Only works if vehicle is under_maintenance.
// ─────────────────────────────────────────────────────────────────────────────
exports.completeMaintenance = async (req, res, next) => {
  try {
    const { vehicleId, maintenanceId } = req.params;
    const [vehicle, maintenance] = await Promise.all([
      Vehicle.findByPk(vehicleId),
      VehicleMaintenance.findByPk(maintenanceId)
    ]);

    if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);
    if (!maintenance) return errorResponse(res, 'Maintenance record not found', 404);
    if (maintenance.vehicle_id !== vehicleId) {
      return errorResponse(res, 'Maintenance record does not belong to this vehicle', 422);
    }
    if (maintenance.status === 'completed') {
      return errorResponse(res, 'Maintenance is already marked as completed', 422);
    }
    if (maintenance.status === 'cancelled') {
      return errorResponse(res, 'Cannot complete a cancelled maintenance record', 422);
    }

    const t = await sequelize.transaction();
    try {
      const now = new Date();
      await maintenance.update({
        status: 'completed',
        end_date: req.body.end_date || now.toISOString().split('T')[0],
        completed_at: now,
        notes: req.body.notes
          ? `${maintenance.notes || ''}\n[Completed] ${req.body.notes}`.trim()
          : maintenance.notes,
        cost: req.body.cost != null ? req.body.cost : maintenance.cost,
        next_service_date: req.body.next_service_date || maintenance.next_service_date,
        next_service_km: req.body.next_service_km || maintenance.next_service_km
      }, { transaction: t });

      // ── Release vehicle to 'available' regardless of which maintenance status it was in
      const releasableStatuses = [
        STATUSES.UNDER_MAINTENANCE,
        STATUSES.MAINTENANCE_SCHEDULED
      ];
      if (releasableStatuses.includes(vehicle.status)) {
        await vehicle.update({ status: STATUSES.AVAILABLE }, { transaction: t });
        await VehicleStatusHistory.create({
          vehicle_id: vehicle.id,
          from_status: vehicle.status,
          to_status: STATUSES.AVAILABLE,
          changed_by: req.user.id,
          reason: `Maintenance completed: ${maintenance.description?.substring(0, 80)}`
        }, { transaction: t });
      }

      await t.commit();
      return successResponse(res, {
        maintenance: maintenance.toJSON(),
        vehicle_status: STATUSES.AVAILABLE
      }, `Maintenance completed — "${vehicle.name}" is now available.`);
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE MAINTENANCE STATUS (inline dropdown)
// ─────────────────────────────────────────────────────────────────────────────
exports.updateMaintenanceStatus = async (req, res, next) => {
  try {
    const { vehicleId, maintenanceId } = req.params;
    const { status, notes, cost, end_date, next_service_date } = req.body;

    const vehicle = await Vehicle.findByPk(vehicleId);
    const maintenance = await VehicleMaintenance.findByPk(maintenanceId);

    if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);
    if (!maintenance) return errorResponse(res, 'Maintenance record not found', 404);
    if (maintenance.status === 'completed') {
      return errorResponse(res, 'Cannot modify a completed maintenance record', 422);
    }

    // Delegate to completeMaintenance for 'completed'
    if (status === 'completed') {
      return exports.completeMaintenance(req, res, next);
    }

    const t = await sequelize.transaction();
    try {
      const updates = { status };
      if (notes) updates.notes = notes;
      if (cost != null) updates.cost = cost;
      if (end_date) updates.end_date = end_date;
      if (next_service_date) updates.next_service_date = next_service_date;
      await maintenance.update(updates, { transaction: t });

      // ── STATUS MACHINE: in_progress → vehicle becomes under_maintenance ──
      if (status === 'in_progress') {
        try { assertMaintenanceStartable(vehicle); } catch (e) {
          await t.rollback();
          return errorResponse(res, e.message, 422);
        }
        const old = vehicle.status;
        await vehicle.update({ status: STATUSES.UNDER_MAINTENANCE }, { transaction: t });
        await VehicleStatusHistory.create({
          vehicle_id: vehicle.id, from_status: old, to_status: STATUSES.UNDER_MAINTENANCE,
          changed_by: req.user.id,
          reason: `Maintenance started: ${maintenance.description?.substring(0, 80)}`
        }, { transaction: t });
      }

      // ── cancelled → release vehicle back to available if it was grounded ──
      if (status === 'cancelled') {
        const groundedStatuses = [STATUSES.MAINTENANCE_SCHEDULED, STATUSES.UNDER_MAINTENANCE];
        if (groundedStatuses.includes(vehicle.status)) {
          const old = vehicle.status;
          await vehicle.update({ status: STATUSES.AVAILABLE }, { transaction: t });
          await VehicleStatusHistory.create({
            vehicle_id: vehicle.id, from_status: old, to_status: STATUSES.AVAILABLE,
            changed_by: req.user.id, reason: 'Maintenance cancelled — vehicle released'
          }, { transaction: t });
        }
      }

      await t.commit();
      return successResponse(res, maintenance, 'Maintenance status updated');
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return errorResponse(res, 'No file uploaded', 400);
    const doc = await VehicleDocument.create({
      vehicle_id: req.params.id,
      document_type: req.body.document_type,
      document_name: req.body.document_name || req.file.originalname,
      file_path: req.file.path,
      expiry_date: req.body.expiry_date,
      uploaded_by: req.user.id,
      notes: req.body.notes
    });
    return successResponse(res, doc, 'Document uploaded', 201);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const stats = await Vehicle.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { is_active: true },
      group: ['status'],
      raw: true
    });
    const total = await Vehicle.count({ where: { is_active: true } });
    const today = new Date();
    const in30 = new Date(today.getTime() + 30 * 86400000);
    const [expiredReg, expiringReg] = await Promise.all([
      Vehicle.count({ where: { is_active: true, registration_expiry: { [Op.lt]: today } } }),
      Vehicle.count({ where: { is_active: true, registration_expiry: { [Op.between]: [today, in30] } } }),
    ]);
    return successResponse(res, { total, byStatus: stats, expiredRegistration: expiredReg, expiringRegistration: expiringReg });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL MAINTENANCE
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllMaintenance = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, vehicle_id, status } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (vehicle_id) where.vehicle_id = vehicle_id;
    if (status) where.status = status;

    const { count, rows } = await VehicleMaintenance.findAndCountAll({
      where,
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'name', 'plate_number', 'status', 'odometer_km'] },
        { model: require('../models/User'), as: 'technician', attributes: ['id', 'name'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });
    return paginatedResponse(res, rows, count, page, limit, 'Maintenance records retrieved');
  } catch (err) { next(err); }
};
