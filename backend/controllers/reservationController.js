const { Op } = require('sequelize');
const Reservation = require('../models/Reservation');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { DispatchRecord, TripLog, VehicleStatusHistory } = require('../models/index');
const { sequelize } = require('../models/associations');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { validationResult } = require('express-validator');
const { STATUSES, assertDispatchable } = require('../utils/vehicleStatus');

// ─────────────────────────────────────────────────────────────────────────────
// OVERLAP CHECK
// ─────────────────────────────────────────────────────────────────────────────
const checkOverlap = async (vehicleId, start, end, excludeId = null) => {
  const where = {
    vehicle_id: vehicleId,
    status: { [Op.notIn]: ['rejected', 'cancelled', 'completed'] },
    [Op.or]: [
      { scheduled_start: { [Op.between]: [start, end] } },
      { scheduled_end:   { [Op.between]: [start, end] } },
      { [Op.and]: [{ scheduled_start: { [Op.lte]: start } }, { scheduled_end: { [Op.gte]: end } }] }
    ]
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return Reservation.findOne({ where });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL
// ─────────────────────────────────────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, purpose, search, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;
    if (purpose) where.purpose = purpose;
    if (date_from && date_to) {
      where.scheduled_start = { [Op.between]: [new Date(date_from), new Date(date_to)] };
    }
    if (req.user.role === 'staff') where.requester_id = req.user.id;

    const { count, rows } = await Reservation.findAndCountAll({
      where,
      include: [
        { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'name', 'plate_number', 'type', 'status'] },
        { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone'] }] },
        {
          model: DispatchRecord, as: 'dispatch', required: false,
          include: [{ model: TripLog, as: 'tripLog', required: false }]
        }
      ],
      limit: parseInt(limit), offset,
      order: [['created_at', 'DESC']]
    });
    return paginatedResponse(res, rows, count, page, limit, 'Reservations retrieved');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [
        { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'name'] },
        { model: Vehicle, as: 'vehicle' },
        { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone'] }] },
        { model: DispatchRecord, as: 'dispatch' }
      ]
    });
    if (!reservation) return errorResponse(res, 'Reservation not found', 404);
    return successResponse(res, reservation);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

    // Validate registration expiry if vehicle pre-selected
    if (req.body.vehicle_id) {
      const vehicle = await Vehicle.findByPk(req.body.vehicle_id);
      if (vehicle && vehicle.registration_expiry && new Date(vehicle.registration_expiry) < new Date()) {
        return errorResponse(res, 'Selected vehicle has an expired registration and cannot be reserved.', 422);
      }
    }

    const reservation = await Reservation.create({
      ...req.body,
      requester_id: req.user.id
    });
    return successResponse(res, reservation, 'Reservation created successfully', 201);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// APPROVE
// Sets vehicle status to 'reserved' (single source of truth).
// ─────────────────────────────────────────────────────────────────────────────
exports.approve = async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return errorResponse(res, 'Reservation not found', 404);
    if (reservation.status !== 'pending') {
      return errorResponse(res, 'Only pending reservations can be approved', 422);
    }

    const { vehicle_id, driver_id } = req.body;

    if(!vehicle_id || !driver_id){
      return errorResponse(res, 'Complete fields before submitting', 409);
    }

    // ── Validate vehicle ─────────────────────────────────────────────────────
    let vehicle = null;
    if (vehicle_id) {
      vehicle = await Vehicle.findByPk(vehicle_id);
      if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);

      // Registration check
      if (vehicle.registration_expiry && new Date(vehicle.registration_expiry) < new Date()) {
        return errorResponse(res, `Cannot approve: "${vehicle.name}" has an expired LTO registration.`, 422);
      }

      //insurance check
      if (vehicle.insurance_expiry && new Date(vehicle.insurance_expiry) < new Date()) {
        return errorResponse(res, `Cannot approve: "${vehicle.name}" has an expired insurance`, 422);
      }

      // State machine check — must be available to be reserved
      if (vehicle.status !== STATUSES.AVAILABLE) {
        const statusLabels = {
          reserved:              'already reserved for another booking',
          in_transit:            'currently in transit',
          maintenance_scheduled: 'scheduled for maintenance',
          under_maintenance:     'currently under maintenance',
          inactive:              'decommissioned / inactive',
        };
        const reason = statusLabels[vehicle.status] || `status: ${vehicle.status}`;
        return errorResponse(res, `Cannot approve: "${vehicle.name}" is ${reason}.`, 422);
      }

      // Double-booking check
      const overlap = await checkOverlap(vehicle_id, reservation.scheduled_start, reservation.scheduled_end, reservation.id);
      if (overlap) {
        return errorResponse(res, `"${vehicle.name}" is already booked for an overlapping time window (${overlap.reservation_code}).`, 409);
      }
    }

    // ── Validate driver ──────────────────────────────────────────────────────
    if (driver_id) {
      const driver = await Driver.findByPk(driver_id);
      if (!driver) return errorResponse(res, 'Driver not found', 404);
      if (driver.status !== 'available') {
        return errorResponse(res, `Driver is not available (status: ${driver.status}).`, 422);
      }
      if (new Date(driver.license_expiry) < new Date()) {
        return errorResponse(res, `Driver's license has expired. Cannot assign to reservation.`, 422);
      }
    }

    const t = await sequelize.transaction();
    try {
      await reservation.update({
        status: 'approved',
        vehicle_id: vehicle_id || reservation.vehicle_id,
        driver_id:  driver_id  || reservation.driver_id,
        approved_by: req.user.id,
        approved_at: new Date()
      }, { transaction: t });

      // ── STATE MACHINE: available → reserved ──────────────────────────────
      if (vehicle) {
        await vehicle.update({ status: STATUSES.RESERVED }, { transaction: t });
        await VehicleStatusHistory.create({
          vehicle_id: vehicle.id,
          from_status: STATUSES.AVAILABLE,
          to_status:   STATUSES.RESERVED,
          changed_by: req.user.id,
          reason: `Reservation ${reservation.reservation_code} approved`
        }, { transaction: t });
      }

      await t.commit();
      return successResponse(res, reservation, 'Reservation approved');
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// REJECT
// Releases reserved vehicle back to available.
// ─────────────────────────────────────────────────────────────────────────────
exports.reject = async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return errorResponse(res, 'Reservation not found', 404);
    if (!['pending', 'approved'].includes(reservation.status)) {
      return errorResponse(res, 'Cannot reject this reservation', 422);
    }

    const t = await sequelize.transaction();
    try {
      // Release vehicle if it was reserved
      if (reservation.vehicle_id && reservation.status === 'approved') {
        const vehicle = await Vehicle.findByPk(reservation.vehicle_id, { transaction: t });
        if (vehicle && vehicle.status === STATUSES.RESERVED) {
          await vehicle.update({ status: STATUSES.AVAILABLE }, { transaction: t });
          await VehicleStatusHistory.create({
            vehicle_id: vehicle.id, from_status: STATUSES.RESERVED, to_status: STATUSES.AVAILABLE,
            changed_by: req.user.id, reason: `Reservation ${reservation.reservation_code} rejected`
          }, { transaction: t });
        }
      }

      await reservation.update({
        status: 'rejected',
        rejection_reason: req.body.reason,
        approved_by: req.user.id,
        approved_at: new Date()
      }, { transaction: t });

      await t.commit();
      return successResponse(res, reservation, 'Reservation rejected');
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// DISPATCH
// Sets vehicle to 'in_transit'. Enforces all state machine rules.
// ─────────────────────────────────────────────────────────────────────────────
exports.dispatch = async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return errorResponse(res, 'Reservation not found', 404);
    if (reservation.status !== 'approved') {
      return errorResponse(res, 'Only approved reservations can be dispatched', 422);
    }
    if (!reservation.vehicle_id || !reservation.driver_id) {
      return errorResponse(res, 'Vehicle and driver must be assigned before dispatching', 422);
    }

    const t = await sequelize.transaction();
    try {
      const vehicle = await Vehicle.findByPk(reservation.vehicle_id, { transaction: t, lock: true });
      const driver  = await Driver.findByPk(reservation.driver_id,  { transaction: t, lock: true });

      // ── STATE MACHINE: enforce dispatchable states ────────────────────────
      try {
        assertDispatchable(vehicle);
      } catch (e) {
        await t.rollback();
        return errorResponse(res, e.message, 422);
      }

      // Driver check
      if (driver.status !== 'available' && driver.status !== 'on_trip') {
        // on_trip guard — driver can only be on one trip
        if (driver.status === 'on_trip') {
          await t.rollback();
          return errorResponse(res, `Driver "${driver.employee_id}" is already on an active trip.`, 422);
        }
        await t.rollback();
        return errorResponse(res, `Driver "${driver.employee_id}" is not available (status: ${driver.status}).`, 422);
      }
      if (driver.status === 'on_trip') {
        await t.rollback();
        return errorResponse(res, `Driver "${driver.employee_id}" is already on an active trip.`, 422);
      }

      // Registration expiry check at dispatch time
      if (vehicle.registration_expiry && new Date(vehicle.registration_expiry) < new Date()) {
        await t.rollback();
        return errorResponse(res, `Cannot dispatch: "${vehicle.name}" has an expired LTO registration.`, 422);
      }

      // ── STATE MACHINE: reserved → in_transit ─────────────────────────────
      const oldVehicleStatus = vehicle.status;
      await vehicle.update({ status: STATUSES.IN_TRANSIT }, { transaction: t });
      await driver.update({ status: 'on_trip' }, { transaction: t });
      await reservation.update({ status: 'dispatched' }, { transaction: t });

      await VehicleStatusHistory.create({
        vehicle_id: vehicle.id,
        from_status: oldVehicleStatus,
        to_status: STATUSES.IN_TRANSIT,
        changed_by: req.user.id,
        reason: `Dispatched — reservation ${reservation.reservation_code}`
      }, { transaction: t });

      const dispatch = await DispatchRecord.create({
        reservation_id: reservation.id,
        vehicle_id: reservation.vehicle_id,
        driver_id:  reservation.driver_id,
        dispatched_by: req.user.id,
        dispatched_at: new Date(),
        odometer_start: req.body.odometer_start,
        fuel_start: req.body.fuel_start
      }, { transaction: t });

      const tripLog = await TripLog.create({
        dispatch_id: dispatch.id,
        reservation_id: reservation.id,
        driver_id:  reservation.driver_id,
        vehicle_id: reservation.vehicle_id,
        trip_date:  new Date(),
        scheduled_start: reservation.scheduled_start,
        scheduled_end:   reservation.scheduled_end
      }, { transaction: t });

      await t.commit();
      return successResponse(res, { dispatch, tripLog }, 'Vehicle dispatched successfully');
    } catch (e) { await t.rollback(); return errorResponse(res, e.message, 422); }
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE TRIP
// Sets vehicle back to 'available'.
// ─────────────────────────────────────────────────────────────────────────────
exports.completeTrip = async (req, res, next) => {
  try {
    const { trip_log_id, reservation_id, odometer_end, fuel_end, fuel_consumed, distance_km, driver_rating, notes } = req.body;

    console.log('[completeTrip] called with trip_log_id:', trip_log_id, 'reservation_id:', reservation_id);

    let tripLog = null;

    if (trip_log_id) {
      tripLog = await TripLog.findByPk(trip_log_id);
      if (!tripLog) {
        const dispatchById = await DispatchRecord.findByPk(trip_log_id);
        if (dispatchById) tripLog = await TripLog.findOne({ where: { dispatch_id: dispatchById.id } });
        if (!tripLog) {
          const dispatchByRes = await DispatchRecord.findOne({ where: { reservation_id: trip_log_id } });
          if (dispatchByRes) tripLog = await TripLog.findOne({ where: { dispatch_id: dispatchByRes.id } });
        }
      }
    }
    if (!tripLog && reservation_id) {
      const dispatch = await DispatchRecord.findOne({ where: { reservation_id } });
      if (dispatch) tripLog = await TripLog.findOne({ where: { dispatch_id: dispatch.id } });
    }
    if (!tripLog && reservation_id) {
      tripLog = await TripLog.findOne({ where: { reservation_id, status: 'in_progress' } });
    }

    if (!tripLog) {
      console.error('[completeTrip] TripLog not found. trip_log_id:', trip_log_id, 'reservation_id:', reservation_id);
      return errorResponse(res, 'Trip log not found. Ensure the reservation was properly dispatched first.', 404);
    }

    const t = await sequelize.transaction();
    try {
      const now = new Date();
      const durationMinutes = tripLog.scheduled_start ? Math.round((now - new Date(tripLog.scheduled_start)) / 60000) : null;
      const delayMinutes = tripLog.scheduled_end ? Math.max(0, Math.round((now - new Date(tripLog.scheduled_end)) / 60000)) : 0;

      await tripLog.update({
        actual_end: now, status: 'completed',
        distance_km, fuel_consumed, driver_rating, notes,
        duration_minutes: durationMinutes, delay_minutes: delayMinutes
      }, { transaction: t });

      await DispatchRecord.update({
        actual_end: now, status: 'completed',
        odometer_end, fuel_end, fuel_consumed, distance_km
      }, { where: { id: tripLog.dispatch_id }, transaction: t });

      const reservation = await Reservation.findByPk(tripLog.reservation_id, { transaction: t });
      if (reservation) await reservation.update({ status: 'completed' }, { transaction: t });

      const vehicle = await Vehicle.findByPk(tripLog.vehicle_id, { transaction: t });
      if (vehicle) {
        const oldStatus = vehicle.status;

        // ── STATE MACHINE: in_transit → available ─────────────────────────
        await vehicle.update({
          status: STATUSES.AVAILABLE,
          odometer_km: sequelize.literal(`odometer_km + ${distance_km || 0}`)
        }, { transaction: t });

        await VehicleStatusHistory.create({
          vehicle_id: vehicle.id, from_status: oldStatus, to_status: STATUSES.AVAILABLE,
          changed_by: req.user.id, reason: `Trip completed — reservation ${reservation?.reservation_code}`
        }, { transaction: t });
      }

      const driver = await Driver.findByPk(tripLog.driver_id, { transaction: t });
      if (driver) {
        await driver.update({
          status: 'available',
          total_trips: sequelize.literal('total_trips + 1'),
          total_km: sequelize.literal(`total_km + ${distance_km || 0}`)
        }, { transaction: t });

        if (driver_rating) {
          const newCount = driver.rating_count + 1;
          const newRating = ((driver.rating * driver.rating_count) + parseFloat(driver_rating)) / newCount;
          await driver.update({ rating: newRating.toFixed(2), rating_count: newCount }, { transaction: t });
        }
      }

      await t.commit();
      return successResponse(res, tripLog, 'Trip completed successfully');
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL
// Releases reserved vehicle back to available.
// ─────────────────────────────────────────────────────────────────────────────
exports.cancel = async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return errorResponse(res, 'Reservation not found', 404);
    if (['completed', 'cancelled'].includes(reservation.status)) {
      return errorResponse(res, 'Cannot cancel this reservation', 422);
    }

    const t = await sequelize.transaction();
    try {
      // Release vehicle if it was reserved (not in_transit — can't cancel mid-trip)
      if (reservation.vehicle_id && reservation.status === 'approved') {
        const vehicle = await Vehicle.findByPk(reservation.vehicle_id, { transaction: t });
        if (vehicle && vehicle.status === STATUSES.RESERVED) {
          await vehicle.update({ status: STATUSES.AVAILABLE }, { transaction: t });
          await VehicleStatusHistory.create({
            vehicle_id: vehicle.id, from_status: STATUSES.RESERVED, to_status: STATUSES.AVAILABLE,
            changed_by: req.user.id, reason: `Reservation ${reservation.reservation_code} cancelled`
          }, { transaction: t });
        }
      }

      await reservation.update({ status: 'cancelled', cancellation_reason: req.body.reason }, { transaction: t });
      await t.commit();
      return successResponse(res, reservation, 'Reservation cancelled');
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};
