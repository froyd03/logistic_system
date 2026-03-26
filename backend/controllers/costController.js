const { Op } = require('sequelize');
const { TransportExpense, FuelLog } = require('../models/index');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { sequelize } = require('../models/associations');
const { successResponse, errorResponse } = require('../utils/response');
const PDFDocument = require('pdfkit');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');

exports.addExpense = async (req, res, next) => {
  try {
    const { expense_type, amount, expense_date, description, vehicle_id, driver_id, trip_log_id } = req.body;

    // Validate required fields
    if (!expense_type) return errorResponse(res, 'expense_type is required', 422);
    if (!amount || isNaN(parseFloat(amount))) return errorResponse(res, 'amount must be a number', 422);
    if (!expense_date) return errorResponse(res, 'expense_date is required', 422);

    // Build payload — only include optional FKs if they have values
    const payload = {
      expense_type,
      amount: parseFloat(amount),
      expense_date,
      description: description || null,
      recorded_by: req.user.id
    };
    if (vehicle_id) payload.vehicle_id = vehicle_id;
    if (driver_id) payload.driver_id = driver_id;
    if (trip_log_id) payload.trip_log_id = trip_log_id;

    const expense = await TransportExpense.create(payload);
    return successResponse(res, expense, 'Expense recorded', 201);
  } catch (err) {
    console.error('[Expense] Create error:', err);
    next(err);
  }
};

exports.addFuelLog = async (req, res, next) => {
  try {
    const { liters, price_per_liter, fuel_date, vehicle_id, driver_id, odometer_reading, station_name, trip_log_id } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!liters || isNaN(parseFloat(liters)) || parseFloat(liters) <= 0) {
      return errorResponse(res, 'liters must be a positive number', 422);
    }
    if (!price_per_liter || isNaN(parseFloat(price_per_liter)) || parseFloat(price_per_liter) <= 0) {
      return errorResponse(res, 'price_per_liter must be a positive number', 422);
    }
    if (!fuel_date) {
      return errorResponse(res, 'fuel_date is required', 422);
    }

    // ── Parse and validate fuel_date ─────────────────────────────────────────
    const parsedDate = new Date(fuel_date);
    if (isNaN(parsedDate.getTime())) {
      return errorResponse(res, 'Invalid fuel_date format. Use ISO 8601 (e.g. 2024-01-15T08:00)', 422);
    }

    // ── Validate vehicle if provided ─────────────────────────────────────────
    if (vehicle_id) {
      const vehicle = await Vehicle.findByPk(vehicle_id);
      if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);
      if (!vehicle.is_active) return errorResponse(res, 'Cannot log fuel for an archived vehicle', 422);
    }

    // ── Calculate total cost ─────────────────────────────────────────────────
    const litersNum = parseFloat(liters);
    const priceNum = parseFloat(price_per_liter);
    const totalCost = parseFloat((litersNum * priceNum).toFixed(2));

    // ── Build insert payload — only include vehicle_id if provided ───────────
    const fuelLogPayload = {
      liters: litersNum,
      price_per_liter: priceNum,
      total_cost: totalCost,
      fuel_date: parsedDate,
      recorded_by: req.user.id
    };
    if (vehicle_id) fuelLogPayload.vehicle_id = vehicle_id;
    if (driver_id) fuelLogPayload.driver_id = driver_id;
    if (odometer_reading) fuelLogPayload.odometer_reading = parseFloat(odometer_reading);
    if (station_name) fuelLogPayload.station_name = station_name;
    if (trip_log_id) fuelLogPayload.trip_log_id = trip_log_id;

    console.log('[FuelLog] Creating with payload:', fuelLogPayload);

    const fuelLog = await FuelLog.create(fuelLogPayload);

    // ── Mirror to TransportExpense (best-effort, don't fail on this) ─────────
    try {
      const expensePayload = {
        expense_type: 'fuel',
        amount: totalCost,
        expense_date: parsedDate.toISOString().split('T')[0],
        description: `Fuel: ${litersNum}L @ ₱${priceNum}/L${station_name ? ` at ${station_name}` : ''}`,
        recorded_by: req.user.id
      };
      if (vehicle_id) expensePayload.vehicle_id = vehicle_id;
      if (driver_id) expensePayload.driver_id = driver_id;
      await TransportExpense.create(expensePayload);
    } catch (expenseErr) {
      console.warn('[FuelLog] Failed to mirror to TransportExpense (non-fatal):', expenseErr.message);
    }

    return successResponse(res, fuelLog, 'Fuel log recorded successfully', 201);
  } catch (err) {
    console.error('[FuelLog] Create error:', err);
    next(err);
  }
};

exports.getMonthlyAnalysis = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);

    const monthlyData = await TransportExpense.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('expense_date')), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        'expense_type'
      ],
      where: { expense_date: { [Op.between]: [start, end] } },
      group: [sequelize.fn('MONTH', sequelize.col('expense_date')), 'expense_type'],
      raw: true
    });

    const vehicleCosts = await TransportExpense.findAll({
      attributes: [
        'vehicle_id',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_cost']
      ],
      where: { expense_date: { [Op.between]: [start, end] }, vehicle_id: { [Op.ne]: null } },
      include: [{ model: Vehicle, as: 'vehicle', attributes: ['name', 'plate_number'] }],
      group: ['vehicle_id', 'vehicle.id'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      limit: 10
    });

    const fuelSummary = await FuelLog.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('liters')), 'total_liters'],
        [sequelize.fn('SUM', sequelize.col('total_cost')), 'total_cost'],
        [sequelize.fn('AVG', sequelize.col('price_per_liter')), 'avg_price']
      ],
      where: { fuel_date: { [Op.between]: [start, end] } },
      raw: true
    });

    return successResponse(res, { monthlyData, vehicleCosts, fuelSummary: fuelSummary[0] });
  } catch (err) { next(err); }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const Driver = require('../models/Driver');
    const Reservation = require('../models/Reservation');
    const { TripLog } = require('../models/index');

    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    const today = new Date();
    const in30 = new Date(today.getTime() + 30 * 86400000);

    const [
      totalVehicles, activeDrivers, inTransit, pendingReservations,
      monthlyExpense, fuelConsumption, completedTrips,
      underMaintenance, maintenanceScheduled, expiredRegistration, expiringRegistration
    ] = await Promise.all([
      Vehicle.count({ where: { is_active: true } }),
      Driver.count({ where: { status: 'available', is_active: true } }),
      Vehicle.count({ where: { status: 'in_transit',         is_active: true } }),
      Reservation.count({ where: { status: 'pending' } }),
      TransportExpense.sum('amount', { where: { expense_date: { [Op.gte]: monthStart } } }),
      FuelLog.sum('liters', { where: { fuel_date: { [Op.gte]: monthStart } } }),
      TripLog.count({ where: { status: 'completed', created_at: { [Op.gte]: monthStart } } }),
      Vehicle.count({ where: { status: 'under_maintenance',     is_active: true } }),
      Vehicle.count({ where: { status: 'maintenance_scheduled', is_active: true } }),
      Vehicle.count({ where: { is_active: true, registration_expiry: { [Op.lt]: today } } }),
      Vehicle.count({ where: { is_active: true, registration_expiry: { [Op.between]: [today, in30] } } }),
    ]);

    // Trips per month (last 6 months)
    const tripsPerMonth = await TripLog.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('trip_date')), 'month'],
        [sequelize.fn('YEAR', sequelize.col('trip_date')), 'year'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        trip_date: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 6)) },
        status: 'completed'
      },
      group: [
        sequelize.fn('MONTH', sequelize.col('trip_date')),
        sequelize.fn('YEAR', sequelize.col('trip_date'))
      ],
      order: [[sequelize.fn('YEAR', sequelize.col('trip_date')), 'ASC'],
              [sequelize.fn('MONTH', sequelize.col('trip_date')), 'ASC']],
      raw: true
    });

    // Vehicle status distribution
    const vehicleStatus = await Vehicle.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { is_active: true },
      group: ['status'],
      raw: true
    });

    return successResponse(res, {
      cards: {
        totalVehicles, activeDrivers, inTransit,
        pendingReservations, monthlyExpense: monthlyExpense || 0,
        fuelConsumption: fuelConsumption || 0, completedTrips,
        underMaintenance: underMaintenance + maintenanceScheduled,
        expiredRegistration, expiringRegistration
      },
      charts: { tripsPerMonth, vehicleStatus }
    });
  } catch (err) { next(err); }
};

exports.exportPDF = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const start = new Date(`${year}-${month}-01`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);

    const expenses = await TransportExpense.findAll({
      where: { expense_date: { [Op.between]: [start, end] } },
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['name', 'plate_number'] }
      ],
      order: [['expense_date', 'ASC']]
    });

    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=transport-report-${year}-${month}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('Transport Cost Report', { align: 'center' });
    doc.fontSize(12).text(`Period: ${start.toDateString()} - ${end.toDateString()}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text('Expense Summary', { underline: true });
    doc.moveDown(0.5);

    expenses.forEach(e => {
      doc.fontSize(10).text(
        `${e.expense_date} | ${e.expense_type.toUpperCase()} | ${e.vehicle?.plate_number || 'N/A'} | PHP ${parseFloat(e.amount).toFixed(2)} | ${e.description || ''}`
      );
    });

    doc.moveDown();
    doc.fontSize(14).text(`Total: PHP ${total.toFixed(2)}`, { bold: true });
    doc.end();
  } catch (err) { next(err); }
};

exports.exportCSV = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const start = new Date(`${year}-${month}-01`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);

    const expenses = await TransportExpense.findAll({
      where: { expense_date: { [Op.between]: [start, end] } },
      include: [{ model: Vehicle, as: 'vehicle', attributes: ['name', 'plate_number'] }],
      raw: true,
      nest: true
    });

    const csvPath = path.join('/tmp', `expenses-${year}-${month}.csv`);
    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'expense_date', title: 'Date' },
        { id: 'expense_type', title: 'Type' },
        { id: 'vehicle.plate_number', title: 'Vehicle' },
        { id: 'amount', title: 'Amount (PHP)' },
        { id: 'description', title: 'Description' }
      ]
    });

    await csvWriter.writeRecords(expenses);

    res.download(csvPath, `transport-expenses-${year}-${month}.csv`, () => {
      fs.unlink(csvPath, () => {});
    });
  } catch (err) { next(err); }
};
