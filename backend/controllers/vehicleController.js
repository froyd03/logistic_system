const { Op } = require('sequelize');
const Vehicle = require('../models/Vehicle');
const { VehicleMaintenance, VehicleDocument, VehicleStatusHistory } = require('../models/index');
const { sequelize } = require('../models/associations');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { validationResult } = require('express-validator');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, type, search, fuel_type } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

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

    return paginatedResponse(res, rows, count, page, limit, 'Vehicles retrieved');
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id, {
      include: [
        { model: VehicleMaintenance, as: 'maintenanceLogs', limit: 10, order: [['created_at', 'DESC']] },
        { model: VehicleDocument, as: 'documents' }
      ]
    });
    if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);
    return successResponse(res, vehicle);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return errorResponse(res, 'Validation failed', 422, errors.array());

    const vehicle = await Vehicle.create(req.body);
    await VehicleStatusHistory.create({
      vehicle_id: vehicle.id,
      from_status: null,
      to_status: vehicle.status,
      changed_by: req.user.id,
      reason: 'Vehicle created'
    });
    return successResponse(res, vehicle, 'Vehicle created successfully', 201);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);

    const oldStatus = vehicle.status;
    await vehicle.update(req.body);

    if (req.body.status && req.body.status !== oldStatus) {
      await VehicleStatusHistory.create({
        vehicle_id: vehicle.id,
        from_status: oldStatus,
        to_status: req.body.status,
        changed_by: req.user.id,
        reason: req.body.status_reason || 'Status updated'
      });
    }
    return successResponse(res, vehicle, 'Vehicle updated');
  } catch (err) { next(err); }
};

exports.archive = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);
    await vehicle.update({ is_active: false, status: 'inactive' });
    await vehicle.destroy(); // soft delete
    return successResponse(res, null, 'Vehicle archived');
  } catch (err) { next(err); }
};

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

exports.addMaintenance = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return errorResponse(res, 'Vehicle not found', 404);

    const t = await sequelize.transaction();
    try {
      const maintenance = await VehicleMaintenance.create(
        { ...req.body, vehicle_id: req.params.id, performed_by: req.user.id },
        { transaction: t }
      );
      if (req.body.status === 'in_progress') {
        const oldStatus = vehicle.status;
        await vehicle.update({ status: 'maintenance' }, { transaction: t });
        await VehicleStatusHistory.create({
          vehicle_id: vehicle.id, from_status: oldStatus, to_status: 'maintenance',
          changed_by: req.user.id, reason: `Maintenance: ${req.body.description}`
        }, { transaction: t });
      }
      await t.commit();
      return successResponse(res, maintenance, 'Maintenance record added', 201);
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
};

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

exports.getStats = async (req, res, next) => {
  try {
    const stats = await Vehicle.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true
    });
    const total = await Vehicle.count();
    return successResponse(res, { total, byStatus: stats });
  } catch (err) { next(err); }
};

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
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'name', 'plate_number'] },
        { model: require('../models/User'), as: 'technician', attributes: ['id', 'name'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });
    return paginatedResponse(res, rows, count, page, limit, 'Maintenance records retrieved');
  } catch (err) { next(err); }
};
