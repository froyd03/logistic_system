const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return errorResponse(res, 'Email and password required', 400);

    const user = await User.findOne({ where: { email } });
    if (!user || !user.is_active) return errorResponse(res, 'Invalid credentials', 401);

    const isValid = await user.validatePassword(password);
    if (!isValid) return errorResponse(res, 'Invalid credentials', 401);

    await user.update({ last_login: new Date() });
    const token = generateToken(user.id);

    return successResponse(res, { token, user }, 'Login successful');
  } catch (err) { next(err); }
};

exports.register = async (req, res, next) => {
  try {
    const exists = await User.findOne({ where: { email: req.body.email } });
    if (exists) return errorResponse(res, 'Email already exists', 409);

    const user = await User.create(req.body);
    const token = generateToken(user.id);
    return successResponse(res, { token, user }, 'Registration successful', 201);
  } catch (err) { next(err); }
};

exports.me = async (req, res) => successResponse(res, req.user, 'Profile retrieved');

exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findByPk(req.user.id);
    const isValid = await user.validatePassword(current_password);
    if (!isValid) return errorResponse(res, 'Current password is incorrect', 400);
    await user.update({ password: new_password });
    return successResponse(res, null, 'Password changed successfully');
  } catch (err) { next(err); }
};
