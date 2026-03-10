const { Op } = require('sequelize');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { DriverPerformance, DriverIncident, TripLog } = require('../models/index');
const { sequelize } = require('../models/associations');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { validationResult } = require('express-validator');
const moment = require('moment');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { license_number: { [Op.like]: `%${search}%` } },
        { employee_id: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Driver.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    // Flag expired/expiring licenses
    const today = moment();
    const data = rows.map(d => {
      const obj = d.toJSON();
      const expiry = moment(d.license_expiry);
      obj.license_status = expiry.isBefore(today) ? 'expired'
        : expiry.diff(today, 'days') <= 30 ? 'expiring_soon' : 'valid';
      return obj;
    });

    return paginatedResponse(res, data, count, page, limit, 'Drivers retrieved');
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const driver = await Driver.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { model: TripLog, as: 'tripLogs', limit: 10, order: [['created_at', 'DESC']] }
      ]
    });
    if (!driver) return errorResponse(res, 'Driver not found', 404);
    return successResponse(res, driver);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

    // Create user account for driver if user_id not provided
    let userId = req.body.user_id;
    if (!userId) {
      const user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password || 'Driver@123',
        role: 'driver',
        phone: req.body.phone
      });
      userId = user.id;
    }

    const driver = await Driver.create({ ...req.body, user_id: userId });
    return successResponse(res, driver, 'Driver created', 201);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return errorResponse(res, 'Driver not found', 404);
    await driver.update(req.body);
    return successResponse(res, driver, 'Driver updated');
  } catch (err) { next(err); }
};

exports.getPerformance = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const perf = await DriverPerformance.findAll({
      where: { driver_id: req.params.id, period_year: year },
      order: [['period_month', 'ASC']]
    });
    return successResponse(res, perf);
  } catch (err) { next(err); }
};

exports.getIncidents = async (req, res, next) => {
  try {
    const incidents = await DriverIncident.findAll({
      where: { driver_id: req.params.id },
      include: [{ model: User, as: 'reporter', attributes: ['id', 'name'] }],
      order: [['incident_date', 'DESC']]
    });
    return successResponse(res, incidents);
  } catch (err) { next(err); }
};

exports.addIncident = async (req, res, next) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return errorResponse(res, 'Driver not found', 404);

    const incident = await DriverIncident.create({
      ...req.body,
      driver_id: req.params.id,
      reported_by: req.user.id
    });

    // Suspend driver if critical incident
    if (req.body.severity === 'critical') {
      await driver.update({ status: 'suspended' });
    }
    return successResponse(res, incident, 'Incident recorded', 201);
  } catch (err) { next(err); }
};

exports.updateRating = async (req, res, next) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return errorResponse(res, 'Driver not found', 404);
    const { rating } = req.body;
    const newCount = driver.rating_count + 1;
    const newRating = ((driver.rating * driver.rating_count) + rating) / newCount;
    await driver.update({ rating: newRating.toFixed(2), rating_count: newCount });
    return successResponse(res, driver, 'Rating updated');
  } catch (err) { next(err); }
};
