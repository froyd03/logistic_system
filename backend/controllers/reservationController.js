const { Op } = require('sequelize');
const Reservation = require('../models/Reservation');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { DispatchRecord, TripLog, VehicleStatusHistory } = require('../models/index');
const { sequelize } = require('../models/associations');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { validationResult } = require('express-validator');
const moment = require('moment');

// Check for overlapping reservations
const checkOverlap = async (vehicleId, start, end, excludeId = null) => {
  const where = {
    vehicle_id: vehicleId,
    status: { [Op.notIn]: ['rejected', 'cancelled', 'completed'] },
    [Op.or]: [
      { scheduled_start: { [Op.between]: [start, end] } },
      { scheduled_end: { [Op.between]: [start, end] } },
      { [Op.and]: [{ scheduled_start: { [Op.lte]: start } }, { scheduled_end: { [Op.gte]: end } }] }
    ]
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return Reservation.findOne({ where });
};

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
    // Staff can only see their own reservations
    if (req.user.role === 'staff') where.requester_id = req.user.id;

    const { count, rows } = await Reservation.findAndCountAll({
      where,
      include: [
        { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'name', 'plate_number', 'type'] },
        { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone'] }] },
        {
          model: DispatchRecord, as: 'dispatch', required: false,
          include: [{ model: TripLog, as: 'tripLog', required: false }]
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    return paginatedResponse(res, rows, count, page, limit, 'Reservations retrieved');
  } catch (err) { next(err); }
};

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

exports.create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

    const { vehicle_id, driver_id, scheduled_start, scheduled_end } = req.body;
    const start = new Date(scheduled_start);
    const end = new Date(scheduled_end);

    if (start >= end) return errorResponse(res, 'End time must be after start time', 422);

    // Check vehicle overlap
    if (vehicle_id) {
      const overlap = await checkOverlap(vehicle_id, start, end);
      if (overlap) return errorResponse(res, 'Vehicle is already reserved for this time period', 409);
    }

    const reservation = await Reservation.create({
      ...req.body,
      requester_id: req.user.id,
      scheduled_start: start,
      scheduled_end: end
    });
    return successResponse(res, reservation, 'Reservation created successfully', 201);
  } catch (err) { next(err); }
};

exports.approve = async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return errorResponse(res, 'Reservation not found', 404);
    if (reservation.status !== 'pending') return errorResponse(res, 'Only pending reservations can be approved', 422);

    const { vehicle_id, driver_id } = req.body;

    //input & data validation
    if(!vehicle_id || !driver_id){
      return errorResponse(res, 'Complete fields before submitting', 409);
    }

    // Validate vehicle
    if (vehicle_id) {
      const vehicle = await Vehicle.findByPk(vehicle_id);
      if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);
      if (vehicle.status !== 'available') return errorResponse(res, 'Vehicle is not available', 422);
      const today = new Date();
      if (vehicle.insurance_expiry && new Date(vehicle.insurance_expiry) < today) {
        return errorResponse(res, 'Vehicle insurance has expired', 422);
      }

      if(vehicle.registration_expiry && new Date(vehicle.registration_expiry) < today){
        return errorResponse(res, 'Vehicle registration has expired', 422);
      }
      
      const overlap = await checkOverlap(vehicle_id, reservation.scheduled_start, reservation.scheduled_end, reservation.id);
      if (overlap) return errorResponse(res, 'Vehicle is already reserved for this time period', 409);
    }

    // Validate driver
    if (driver_id) {
      const driver = await Driver.findByPk(driver_id);
      if (!driver) return errorResponse(res, 'Driver not found', 404);
      if (driver.status !== 'available') return errorResponse(res, 'Driver is not available', 422);
      if (new Date(driver.license_expiry) < new Date()) {
        return errorResponse(res, 'Driver license has expired', 422);
      }
    }

    await reservation.update({
      status: 'approved',
      vehicle_id: vehicle_id || reservation.vehicle_id,
      driver_id: driver_id || reservation.driver_id,
      approved_by: req.user.id,
      approved_at: new Date()
    });

    return successResponse(res, reservation, 'Reservation approved');
  } catch (err) { next(err); }
};

exports.reject = async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return errorResponse(res, 'Reservation not found', 404);
    if (!['pending', 'approved'].includes(reservation.status)) {
      return errorResponse(res, 'Cannot reject this reservation', 422);
    }
    await reservation.update({
      status: 'rejected',
      rejection_reason: req.body.reason,
      approved_by: req.user.id,
      approved_at: new Date()
    });
    return successResponse(res, reservation, 'Reservation rejected');
  } catch (err) { next(err); }
};

exports.dispatch = async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return errorResponse(res, 'Reservation not found', 404);
    if (reservation.status !== 'approved') return errorResponse(res, 'Only approved reservations can be dispatched', 422);
    if (!reservation.vehicle_id || !reservation.driver_id) {
      return errorResponse(res, 'Vehicle and driver must be assigned before dispatching', 422);
    }

    const t = await sequelize.transaction();
    try {
      const vehicle = await Vehicle.findByPk(reservation.vehicle_id, { transaction: t, lock: true });
      const driver = await Driver.findByPk(reservation.driver_id, { transaction: t, lock: true });

      // ── Cannot dispatch a vehicle under maintenance ───────────────────────
      if (vehicle.status === 'maintenance') throw new Error(`Vehicle "${vehicle.name}" is currently under maintenance and cannot be dispatched. Complete the maintenance record first.`);
      if (vehicle.status !== 'available') throw new Error(`Vehicle "${vehicle.name}" is not available (current status: ${vehicle.status})`);
      if (driver.status !== 'available') throw new Error('Driver is no longer available');

      // Update statuses
      const oldVehicleStatus = vehicle.status;
      await vehicle.update({ status: 'reserved' }, { transaction: t });
      await driver.update({ status: 'on_trip' }, { transaction: t });
      await reservation.update({ status: 'dispatched' }, { transaction: t });

      const dispatch = await DispatchRecord.create({
        reservation_id: reservation.id,
        vehicle_id: reservation.vehicle_id,
        driver_id: reservation.driver_id,
        dispatched_by: req.user.id,
        dispatched_at: new Date(),
        odometer_start: req.body.odometer_start,
        fuel_start: req.body.fuel_start
      }, { transaction: t });

      await VehicleStatusHistory.create({
        vehicle_id: vehicle.id, from_status: oldVehicleStatus, to_status: 'reserved',
        changed_by: req.user.id, reason: `Dispatched for reservation ${reservation.reservation_code}`
      }, { transaction: t });

      const tripLog = await TripLog.create({
        dispatch_id: dispatch.id,
        reservation_id: reservation.id,
        driver_id: reservation.driver_id,
        vehicle_id: reservation.vehicle_id,
        trip_date: new Date(),
        scheduled_start: reservation.scheduled_start,
        scheduled_end: reservation.scheduled_end
      }, { transaction: t });

      await t.commit();
      return successResponse(res, { dispatch, tripLog }, 'Vehicle dispatched successfully');
    } catch (e) { await t.rollback(); return errorResponse(res, e.message, 422); }
  } catch (err) { next(err); }
};

exports.completeTrip = async (req, res, next) => {
  try {
    const { trip_log_id, reservation_id, odometer_end, fuel_end, fuel_consumed, distance_km, driver_rating, notes } = req.body;

    console.log('[completeTrip] called with trip_log_id:', trip_log_id, 'reservation_id:', reservation_id);

    // ── Find the TripLog using every available identifier ─────────────────────
    let tripLog = null;

    // 1. Direct TripLog PK lookup
    if (trip_log_id) {
      tripLog = await TripLog.findByPk(trip_log_id);
      if (!tripLog) {
        // 2. Maybe trip_log_id is actually a DispatchRecord PK
        const dispatchById = await DispatchRecord.findByPk(trip_log_id);
        if (dispatchById) {
          tripLog = await TripLog.findOne({ where: { dispatch_id: dispatchById.id } });
        }
        // 3. Maybe trip_log_id is a reservation_id
        if (!tripLog) {
          const dispatchByRes = await DispatchRecord.findOne({ where: { reservation_id: trip_log_id } });
          if (dispatchByRes) {
            tripLog = await TripLog.findOne({ where: { dispatch_id: dispatchByRes.id } });
          }
        }
      }
    }

    // 4. Fallback: use reservation_id to find via DispatchRecord
    if (!tripLog && reservation_id) {
      const dispatch = await DispatchRecord.findOne({ where: { reservation_id } });
      if (dispatch) {
        tripLog = await TripLog.findOne({ where: { dispatch_id: dispatch.id } });
      }
    }

    // 5. Last resort: look for any in-progress TripLog tied to the reservation directly
    if (!tripLog && reservation_id) {
      tripLog = await TripLog.findOne({ where: { reservation_id, status: 'in_progress' } });
    }

    if (!tripLog) {
      console.error('[completeTrip] TripLog not found after all strategies. trip_log_id:', trip_log_id, 'reservation_id:', reservation_id);
      return errorResponse(res, 'Trip log not found. Ensure the reservation was properly dispatched first.', 404);
    }

    console.log('[completeTrip] Found TripLog:', tripLog.id, 'dispatch_id:', tripLog.dispatch_id);

    const t = await sequelize.transaction();
    try {
      const now = new Date();
      const durationMinutes = Math.round((now - tripLog.scheduled_start) / 60000);
      const delayMinutes = Math.max(0, Math.round((now - tripLog.scheduled_end) / 60000));

      await tripLog.update({
        actual_end: now, status: 'completed',
        odometer_end, distance_km, fuel_consumed, driver_rating, notes,
        duration_minutes: durationMinutes, delay_minutes: delayMinutes
      }, { transaction: t });

      await DispatchRecord.update({
        actual_end: now, status: 'completed',
        odometer_end, fuel_end, fuel_consumed, distance_km
      }, { where: { id: tripLog.dispatch_id }, transaction: t });

      const reservation = await Reservation.findByPk(tripLog.reservation_id, { transaction: t });
      await reservation.update({ status: 'completed' }, { transaction: t });

      const vehicle = await Vehicle.findByPk(tripLog.vehicle_id, { transaction: t });
      const oldStatus = vehicle.status;
      await vehicle.update({
        status: 'available',
        odometer_km: sequelize.literal(`odometer_km + ${distance_km || 0}`)
      }, { transaction: t });

      await VehicleStatusHistory.create({
        vehicle_id: vehicle.id, from_status: oldStatus, to_status: 'available',
        changed_by: req.user.id, reason: 'Trip completed'
      }, { transaction: t });

      const driver = await Driver.findByPk(tripLog.driver_id, { transaction: t });
      await driver.update({
        status: 'available',
        total_trips: sequelize.literal('total_trips + 1'),
        total_km: sequelize.literal(`total_km + ${distance_km || 0}`)
      }, { transaction: t });

      if (driver_rating) {
        const newCount = driver.rating_count + 1;
        const newRating = ((driver.rating * driver.rating_count) + driver_rating) / newCount;
        await driver.update({ rating: newRating.toFixed(2), rating_count: newCount }, { transaction: t });
      }

      await t.commit();
      return successResponse(res, tripLog, 'Trip completed successfully');
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};

exports.cancel = async (req, res, next) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) return errorResponse(res, 'Reservation not found', 404);
    if (['completed', 'cancelled'].includes(reservation.status)) {
      return errorResponse(res, 'Cannot cancel this reservation', 422);
    }
    await reservation.update({ status: 'cancelled', cancellation_reason: req.body.reason });
    return successResponse(res, reservation, 'Reservation cancelled');
  } catch (err) { next(err); }
};
