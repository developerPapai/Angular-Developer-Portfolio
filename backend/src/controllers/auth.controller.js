import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = signToken(user._id);
    res.json({
      success: true,
      token,
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/seed  (create first admin — disabled after first use)
const seed = async (req, res, next) => {
  try {
    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const user = await User.create({ email, password, role: 'admin' });
    const token = signToken(user._id);
    res.status(201).json({ success: true, message: 'Admin created', token });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// PUT /api/auth/update-account
const updateAccount = async (req, res, next) => {
  try {
    const { currentPassword, email, password } = req.body;
    
    // Support newPassword key if called from old client/changePassword wrapper
    const newPassword = password || req.body.newPassword;
    const newEmail = email;

    if (!currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password is required to verify changes' });
    }

    if (!newEmail && !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide either a new email or a new password' });
    }

    // Retrieve user with password
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Incorrect current password' });
    }

    // If changing email, check if it's already in use
    if (newEmail && newEmail.toLowerCase() !== user.email.toLowerCase()) {
      const emailExists = await User.findOne({ email: newEmail.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email is already in use' });
      }
      user.email = newEmail.toLowerCase();
    }

    // If changing password
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
      }
      user.password = newPassword;
    }

    await user.save();

    // Sign a new token since user details might have changed
    const token = signToken(user._id);

    res.json({
      success: true,
      message: 'Account credentials updated successfully',
      token,
      user: { id: user._id, email: user.email, role: user.role }
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/change-password (legacy route / wrapper)
const changePassword = async (req, res, next) => {
  req.body.password = req.body.newPassword;
  return updateAccount(req, res, next);
};

export { login, seed, getMe, changePassword, updateAccount };
