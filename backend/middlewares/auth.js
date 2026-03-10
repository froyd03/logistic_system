const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication required', 401);
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return errorResponse(res, 'Invalid or expired token', 401);
    }
    req.user = user;
    next();
  } catch (err) {
    return errorResponse(res, 'Invalid token', 401);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return errorResponse(res, 'You do not have permission to perform this action', 403);
  }
  next();
};

const auditLog = require('./auditMiddleware');

module.exports = { authenticate, authorize };
