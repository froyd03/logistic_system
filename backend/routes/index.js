const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_PATH || './uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 } });

const authCtrl = require('../controllers/authController');
const vehicleCtrl = require('../controllers/vehicleController');
const driverCtrl = require('../controllers/driverController');
const reservationCtrl = require('../controllers/reservationController');
const costCtrl = require('../controllers/costController');

// ─── Auth Routes ─────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/auth/login', authCtrl.login);
router.post('/auth/register', authCtrl.register);
router.get('/auth/me', authenticate, authCtrl.me);
router.put('/auth/password', authenticate, authCtrl.changePassword);

// ─── Vehicle Routes ───────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     tags: [Vehicles]
 *     summary: Get all vehicles
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, reserved, in_transit, maintenance, inactive]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of vehicles
 */
router.get('/vehicles', authenticate, vehicleCtrl.getAll);
router.get('/vehicles/stats', authenticate, vehicleCtrl.getStats);
router.get('/vehicles/:id', authenticate, vehicleCtrl.getById);
router.post('/vehicles', authenticate, authorize('admin', 'transport_manager'), vehicleCtrl.create);
router.put('/vehicles/:id', authenticate, authorize('admin', 'transport_manager'), vehicleCtrl.update);
router.delete('/vehicles/:id', authenticate, authorize('admin'), vehicleCtrl.archive);
router.get('/vehicles/:id/status-history', authenticate, vehicleCtrl.getStatusHistory);
router.post('/vehicles/:id/maintenance', authenticate, authorize('admin', 'transport_manager'), vehicleCtrl.addMaintenance);
router.post('/vehicles/:id/documents', authenticate, authorize('admin', 'transport_manager'), upload.single('file'), vehicleCtrl.uploadDocument);

// ─── Maintenance list (cross-vehicle) ──────────────────────────────────────
router.get('/maintenance', authenticate, authorize('admin', 'transport_manager'), vehicleCtrl.getAllMaintenance);

// ─── Driver Routes ─────────────────────────────────────────────────────────────
router.get('/drivers', authenticate, driverCtrl.getAll);
router.get('/drivers/:id', authenticate, driverCtrl.getById);
router.post('/drivers', authenticate, authorize('admin', 'transport_manager'), driverCtrl.create);
router.put('/drivers/:id', authenticate, authorize('admin', 'transport_manager'), driverCtrl.update);
router.get('/drivers/:id/performance', authenticate, driverCtrl.getPerformance);
router.get('/drivers/:id/incidents', authenticate, driverCtrl.getIncidents);
router.post('/drivers/:id/incidents', authenticate, authorize('admin', 'transport_manager'), driverCtrl.addIncident);
router.patch('/drivers/:id/rating', authenticate, driverCtrl.updateRating);

// ─── Reservation Routes ────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/reservations:
 *   post:
 *     tags: [Reservations]
 *     summary: Create a reservation
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [purpose, pickup_location, dropoff_location, scheduled_start, scheduled_end]
 *             properties:
 *               purpose:
 *                 type: string
 *                 enum: [guest_transport, supplier_pickup, catering_delivery, staff_shuttle, other]
 *               pickup_location: { type: string }
 *               dropoff_location: { type: string }
 *               scheduled_start: { type: string, format: date-time }
 *               scheduled_end: { type: string, format: date-time }
 */
router.get('/reservations', authenticate, reservationCtrl.getAll);
router.get('/reservations/:id', authenticate, reservationCtrl.getById);
router.post('/reservations', authenticate, reservationCtrl.create);
router.patch('/reservations/:id/approve', authenticate, authorize('admin', 'transport_manager'), reservationCtrl.approve);
router.patch('/reservations/:id/reject', authenticate, authorize('admin', 'transport_manager'), reservationCtrl.reject);
router.post('/reservations/:id/dispatch', authenticate, authorize('admin', 'transport_manager'), reservationCtrl.dispatch);
router.post('/trips/complete', authenticate, authorize('admin', 'transport_manager', 'driver'), reservationCtrl.completeTrip);
router.patch('/reservations/:id/cancel', authenticate, reservationCtrl.cancel);

// ─── Trip Logs (alias) ────────────────────────────────────────────────────────
// The frontend TripLogs page queries /reservations with status filter — no extra route needed

// ─── Cost & Analytics Routes ──────────────────────────────────────────────────
router.get('/dashboard/stats', authenticate, costCtrl.getDashboardStats);
router.post('/expenses', authenticate, costCtrl.addExpense);
router.post('/fuel-logs', authenticate, costCtrl.addFuelLog);
router.get('/analytics/monthly', authenticate, costCtrl.getMonthlyAnalysis);
router.get('/reports/export-pdf', authenticate, authorize('admin', 'transport_manager'), costCtrl.exportPDF);
router.get('/reports/export-csv', authenticate, authorize('admin', 'transport_manager'), costCtrl.exportCSV);

module.exports = router;
