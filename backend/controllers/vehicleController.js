const { Op } = require('sequelize');
const Vehicle = require('../models/Vehicle');
const { VehicleMaintenance, VehicleDocument, VehicleStatusHistory, TripLog } = require('../models/index');
const { sequelize } = require('../models/associations');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { validationResult } = require('express-validator');
const { computeExpiryDates, alignInsuranceToRegistration, getRegistrationStatus } = require('../utils/vehicleDates');

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
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    // Attach computed registration_status to each vehicle for frontend coloring
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

    const data = {
      ...vehicle.toJSON(),
      registration_status: getRegistrationStatus(vehicle.registration_expiry)
    };
    return successResponse(res, data);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// Auto-computes registration_expiry and insurance_expiry from registration_start_date
// ─────────────────────────────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

    const payload = { ...req.body };

    // ── Auto-compute expiry dates if registration_start_date is provided ──────
    if (payload.registration_start_date && !payload.registration_expiry) {
      const computed = computeExpiryDates(payload.registration_start_date);
      payload.registration_expiry = computed.registration_expiry;
      payload.insurance_expiry    = computed.insurance_expiry;
      console.log(`[Vehicle.create] Auto-computed: reg_expiry=${payload.registration_expiry}, ins_expiry=${payload.insurance_expiry}`);
    }

    // ── If only registration_expiry is provided manually, align insurance ─────
    if (payload.registration_expiry && !payload.insurance_expiry) {
      payload.insurance_expiry = alignInsuranceToRegistration(payload.registration_expiry);
    }

    const vehicle = await Vehicle.create(payload);
    await VehicleStatusHistory.create({
      vehicle_id: vehicle.id,
      from_status: null,
      to_status: vehicle.status,
      changed_by: req.user.id,
      reason: 'Vehicle registered into fleet'
    });

    return successResponse(res, {
      ...vehicle.toJSON(),
      registration_status: getRegistrationStatus(vehicle.registration_expiry)
    }, 'Vehicle created successfully', 201);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// Prevents manual mismatch of insurance and registration dates
// ─────────────────────────────────────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);

    const payload = { ...req.body };

    // ── If registration_start_date changed, recompute both expiry dates ───────
    if (payload.registration_start_date &&
        payload.registration_start_date !== vehicle.registration_start_date) {
      const computed = computeExpiryDates(payload.registration_start_date);
      payload.registration_expiry = computed.registration_expiry;
      payload.insurance_expiry    = computed.insurance_expiry;
    }

    // ── If only registration_expiry changed, re-align insurance ───────────────
    if (payload.registration_expiry &&
        payload.registration_expiry !== vehicle.registration_expiry &&
        !payload.insurance_expiry) {
      payload.insurance_expiry = alignInsuranceToRegistration(payload.registration_expiry);
    }

    const oldStatus = vehicle.status;
    await vehicle.update(payload);

    if (payload.status && payload.status !== oldStatus) {
      await VehicleStatusHistory.create({
        vehicle_id: vehicle.id,
        from_status: oldStatus,
        to_status: payload.status,
        changed_by: req.user.id,
        reason: payload.status_reason || 'Status updated manually'
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
    if (vehicle.status === 'in_transit') {
      return errorResponse(res, 'Cannot archive a vehicle that is currently in transit', 422);
    }
    await vehicle.update({ is_active: false, status: 'inactive' });
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
// Business rules:
//   1. Vehicle cannot be put into maintenance if already under maintenance
//   2. Cannot dispatch a vehicle under maintenance
//   3. Odometer is auto-captured from vehicle record (not user input)
//   4. Completing maintenance sets vehicle back to 'available'
// ─────────────────────────────────────────────────────────────────────────────
exports.addMaintenance = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);

    // ── Rule 1: Block if already under maintenance ────────────────────────────
    if (vehicle.status === 'maintenance') {
      return errorResponse(
        res,
        `Vehicle "${vehicle.name}" is already under maintenance. Complete or cancel the current maintenance record before adding a new one.`,
        422
      );
    }

    // ── Rule 2: Block if vehicle is currently in transit ──────────────────────
    if (vehicle.status === 'in_transit') {
      return errorResponse(
        res,
        `Vehicle "${vehicle.name}" is currently in transit and cannot be sent for maintenance.`,
        422
      );
    }

    const t = await sequelize.transaction();
    try {
      // ── Rule 3: Auto-capture odometer — never trust user input ────────────
      // Also check last completed trip log for most recent odometer reading
      let latestOdometer = parseFloat(vehicle.odometer_km) || 0;
      try {
        const lastTrip = await TripLog.findOne({
          where: { vehicle_id: vehicle.id, status: 'completed' },
          order: [['actual_end', 'DESC']]
        });
        // Use the higher of vehicle record vs last trip (in case odometer wasn't updated)
        if (lastTrip?.odometer_end) {
          latestOdometer = Math.max(latestOdometer, parseFloat(lastTrip.odometer_end));
        }
      } catch (_) { /* non-fatal — use vehicle odometer */ }

      const payload = {
        ...req.body,
        vehicle_id: req.params.id,
        performed_by: req.user.id,
        odometer_at_service: latestOdometer   // ← always system-generated
      };
      // Strip any client-sent odometer override
      delete payload.odometer_override;

      const maintenance = await VehicleMaintenance.create(payload, { transaction: t });

      // Set vehicle to maintenance status for in_progress and emergency records
      if (['in_progress', 'emergency'].includes(req.body.status) || req.body.maintenance_type === 'emergency') {
        const oldStatus = vehicle.status;
        await vehicle.update({ status: 'maintenance' }, { transaction: t });
        await VehicleStatusHistory.create({
          vehicle_id: vehicle.id,
          from_status: oldStatus,
          to_status: 'maintenance',
          changed_by: req.user.id,
          reason: `Maintenance started: ${req.body.description?.substring(0, 80) || req.body.maintenance_type}`
        }, { transaction: t });
      }

      await t.commit();
      return successResponse(res, {
        ...maintenance.toJSON(),
        odometer_captured: latestOdometer
      }, 'Maintenance record added', 201);
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE MAINTENANCE
// PATCH /vehicles/:vehicleId/maintenance/:maintenanceId/complete
// Sets maintenance status to 'completed' and frees the vehicle back to 'available'
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

      // Complete the maintenance record
      await maintenance.update({
        status: 'completed',
        end_date: req.body.end_date || now.toISOString().split('T')[0],
        completed_at: now,
        notes: req.body.notes ? `${maintenance.notes || ''}\n[Completed] ${req.body.notes}`.trim() : maintenance.notes,
        cost: req.body.cost != null ? req.body.cost : maintenance.cost,
        next_service_date: req.body.next_service_date || maintenance.next_service_date,
        next_service_km: req.body.next_service_km || maintenance.next_service_km
      }, { transaction: t });

      // ── Release vehicle back to available (only if it was in maintenance) ──
      if (vehicle.status === 'maintenance') {
        await vehicle.update({ status: 'available' }, { transaction: t });
        await VehicleStatusHistory.create({
          vehicle_id: vehicle.id,
          from_status: 'maintenance',
          to_status: 'available',
          changed_by: req.user.id,
          reason: `Maintenance completed: ${maintenance.description?.substring(0, 80)}`
        }, { transaction: t });
      }

      await t.commit();
      return successResponse(res, {
        maintenance: maintenance.toJSON(),
        vehicle_status: vehicle.status === 'maintenance' ? 'available' : vehicle.status
      }, `Maintenance completed. Vehicle "${vehicle.name}" is now available.`);
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE MAINTENANCE STATUS  (PATCH /vehicles/:vehicleId/maintenance/:maintenanceId)
// Used for inline status changes in the Maintenance table dropdown
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

    // Delegate to completeMaintenance for 'completed' status
    if (status === 'completed') {
      req.params.maintenanceId = maintenanceId;
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

      // If moving to in_progress and vehicle isn't already in maintenance, set it
      if (status === 'in_progress' && vehicle.status !== 'maintenance') {
        const oldVehicleStatus = vehicle.status;
        await vehicle.update({ status: 'maintenance' }, { transaction: t });
        await VehicleStatusHistory.create({
          vehicle_id: vehicle.id,
          from_status: oldVehicleStatus,
          to_status: 'maintenance',
          changed_by: req.user.id,
          reason: `Maintenance started: ${maintenance.description?.substring(0, 80)}`
        }, { transaction: t });
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

    // Count registration alerts
    const today = new Date();
    const in30 = new Date(today.getTime() + 30 * 86400000);
    const expiredReg = await Vehicle.count({
      where: { is_active: true, registration_expiry: { [Op.lt]: today } }
    });
    const expiringReg = await Vehicle.count({
      where: {
        is_active: true,
        registration_expiry: { [Op.between]: [today, in30] }
      }
    });

    return successResponse(res, { total, byStatus: stats, expiredRegistration: expiredReg, expiringRegistration: expiringReg });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL MAINTENANCE (cross-vehicle list)
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
