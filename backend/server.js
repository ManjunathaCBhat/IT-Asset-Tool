// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const moment = require('moment'); // Import moment for date calculations

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json()); // For parsing application/json

// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI;
// --- JWT Secret ---
const JWT_SECRET = process.env.JWT_SECRET;

// --- Mongoose Schemas ---
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Editor', 'Viewer'], default: 'Viewer' },
    // Add these fields if you implement password reset token generation
    // resetPasswordToken: String,
    // resetPasswordExpires: Date
});

const EquipmentSchema = new mongoose.Schema({
    assetId: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    status: { type: String, required: true, enum: ['In Use', 'In Stock', 'Damaged', 'E-Waste', 'Removed'] },
    model: { type: String },
    serialNumber: { type: String },
    // IMPORTANT: To make date comparisons work reliably, this should be a Date type
    // If you store 'Invalid date' string, MongoDB cannot query it as a date.
    warrantyInfo: { type: Date }, // Changed to Date type for proper date comparisons
    location: { type: String },
    comment: { type: String },
    assigneeName: { type: String },
    position: { type: String },
    employeeEmail: { type: String },
    phoneNumber: { type: String },
    department: { type: String },
    damageDescription: { type: String },
    purchasePrice: { type: Number, default: 0 },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true }); // timestamps adds createdAt and updatedAt

const User = mongoose.model('User', UserSchema);
const Equipment = mongoose.model('Equipment', EquipmentSchema);

// --- Function to Seed First Admin User ---
const seedAdminUser = async () => {
    const ADMIN_EMAIL = 'admin@example.com';
    try {
        const adminExists = await User.findOne({ email: ADMIN_EMAIL });
        if (!adminExists) {
            console.log(`No user found with email ${ADMIN_EMAIL}. Creating one...`);
            const admin = new User({
                email: ADMIN_EMAIL,
                password: 'password123',
                role: 'Admin'
            });
            const salt = await bcrypt.genSalt(10);
            admin.password = await bcrypt.hash(admin.password, salt);
            await admin.save();
            console.log('Admin user created successfully!');
        } else {
            console.log('Admin user already exists.');
        }
    } catch (error) {
        console.error('Error seeding admin user:', error);
    }
};

// --- Connect to DB and Seed Admin ---
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB connected successfully.');
        seedAdminUser();
    })
    .catch(err => console.error('MongoDB connection error:', err));


// --- Authentication & Role Middleware ---
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        console.log('Auth middleware: No token provided');
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user; // Attach user info to request
        next();
    } catch (e) {
        console.log('Auth middleware: Invalid token', e.message);
        res.status(400).json({ msg: 'Token is not valid' });
    }
};

const requireRole = (roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        console.log(`Access denied for user ${req.user ? req.user.email : 'N/A'} (role: ${req.user ? req.user.role : 'N/A'}) to route needing roles: ${roles.join(', ')}`);
        return res.status(403).json({ msg: 'Access denied. Insufficient role.' });
    }
    next();
};

// --- API Endpoints ---

// --- User Endpoints (Keep these together) ---
app.post('/api/users/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
        const payload = { user: { id: user.id, role: user.role, email: user.email } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: payload.user });
        });
    } catch (err) { console.error(err.message); res.status(500).send('Server error'); }
});

app.get('/api/users', [auth, requireRole(['Admin'])], async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

app.post('/api/users/create', [auth, requireRole(['Admin'])], async (req, res) => {
    const { email, password, role } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });
        user = new User({ email, password, role });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        res.json({ msg: 'User created successfully' });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

app.post('/api/reset-password', async (req, res) => {
    console.log('Reset password request body:', req.body);
    const { email, token, newPassword } = req.body;
    try {
        const user = await User.findOne({
            email,
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() } // Token not expired
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Clear reset token fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.json({ message: 'Password has been reset successfully.' });
    } catch (err) {
        console.error('Reset password error:', err.message);
        res.status(500).json({ message: 'Failed to reset password.' });
    }
});

app.delete('/api/users/:id', [auth, requireRole(['Admin'])], async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ msg: 'Cannot delete your own account' });
        }
        const deletedUser = await User.findByIdAndRemove(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ msg: 'User deleted' });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});


// --- Equipment Endpoints (REORDERED FOR SPECIFICITY) ---
// ORDER: Most specific dashboard-related endpoints first, then general gets, then CUD.
// This prevents broader routes from "eating" requests meant for more specific ones.


// 1. Dashboard Specific Summary Endpoints
// @route   GET /api/equipment/summary
// @desc    Get summary counts for dashboard
// @access  Private
app.get('/api/equipment/summary', auth, async (req, res) => {
    try {
        const totalAssets = await Equipment.countDocuments({ isDeleted: { $ne: true } });
        const inUse = await Equipment.countDocuments({ status: 'In Use', isDeleted: { $ne: true } });
        const inStock = await Equipment.countDocuments({ status: 'In Stock', isDeleted: { $ne: true } });
        const damaged = await Equipment.countDocuments({ status: 'Damaged', isDeleted: { $ne: true } });
        const eWaste = await Equipment.countDocuments({ status: 'E-Waste', isDeleted: { $ne: true } });

        // FIX: Declare 'removed' before using it in res.json
        const removed = await Equipment.countDocuments({
            $or: [
                { status: 'E-Waste' },
                { status: 'Damaged' },
                { status: 'Removed' },
                { isDeleted: true }
            ]
        });

        res.json({
            totalAssets,
            inUse,
            inStock,
            damaged,
            eWaste,
            removed, // Ensure 'removed' is included in the response
        });
    } catch (err) {
        console.error('Error in /api/equipment/summary:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/equipment/total-value
// @desc    Calculate total value of assets (excluding soft-deleted)
// @access  Private
app.get('/api/equipment/total-value', auth, async (req, res) => {
    try {
        const result = await Equipment.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$purchasePrice" }
                }
            }
        ]);

        const totalValue = result.length > 0 ? result[0].total : 0;
        res.json({ totalValue });
    } catch (err) {
        console.error('Error in /api/equipment/total-value:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/equipment/expiring-warranty
// @desc    Get assets with warranty expiring in 30 days (excluding E-Waste and Damaged)
// @access  Private
app.get('/api/equipment/expiring-warranty', auth, async (req, res) => {
    try {
        const thirtyDaysFromNow = moment().add(30, 'days').toDate();
        const now = new Date();

        const expiringItems = await Equipment.find({
            warrantyInfo: { $exists: true, $ne: null, $type: 9, $gte: now, $lte: thirtyDaysFromNow },
            status: { $nin: ['E-Waste', 'Damaged', 'Removed'] }, // Exclude 'Removed' status too
            isDeleted: { $ne: true }
        }).select('model serialNumber warrantyInfo');

        res.json(expiringItems);
    } catch (err) {
        console.error('Error in /api/equipment/expiring-warranty:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/equipment/grouped-by-email
// @desc    Get assets grouped by employee email
// @access  Private
app.get('/api/equipment/grouped-by-email', auth, async (req, res) => {
  try {
    const groupedData = await Equipment.aggregate([
      { $match: { status: "In Use", isDeleted: { $ne: true } } },
      {
        $group: {
          _id: "$employeeEmail",
          assigneeName: { $first: "$assigneeName" },
          position: { $first: "$position" },
          phoneNumber: { $first: "$phoneNumber" },
          department: { $first: "$department" },
          assets: {
              $push: {
                  _id: "$_id",
                  assetId: "$assetId",
                  category: "$category",
                  status: "$status",
                  model: "$model",
                  serialNumber: "$serialNumber",
                  warrantyInfo: "$warrantyInfo",
                  location: "$location",
                  comment: "$comment",
                  damageDescription: "$damageDescription",
                  purchasePrice: "$purchasePrice",
                  createdAt: "$createdAt",
                  updatedAt: "$updatedAt"
              }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
            _id: 0,
            employeeEmail: "$_id",
            assigneeName: 1,
            position: 1,
            phoneNumber: 1,
            department: 1,
            assets: 1,
            count: 1
        }
      },
      {
        $sort: { employeeEmail: 1 }
      }
    ]);
    res.json(groupedData);
  } catch (error) {
    console.error("Error in grouped-by-email aggregation:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// @route   GET /api/equipment/removed
// @desc    Get all assets that have been marked as removed/e-waste/damaged
// @access  Private (e.g., Admin/Editor role, potentially Viewer too for history)
app.get('/api/equipment/removed', auth, async (req, res) => {
  try {
    // Assets are considered "removed" if their status is 'E-Waste' or 'Damaged',
    // or if they have an 'isDeleted: true' flag.
    const removedAssets = await Equipment.find({
      $or: [
        { status: 'E-Waste' },
        { status: 'Damaged' },
        { status: 'Removed' }, // Include the new 'Removed' status here
        { isDeleted: true }
      ]
    })
    .sort({ updatedAt: -1 });

    res.json(removedAssets);

  } catch (err) {
    console.error('Error in /api/equipment/removed:', err.message);
    res.status(500).send('Server Error: Could not fetch removed assets.');
  }
});


// 2. Specific Dynamic Route (should come before the general /api/equipment)
// @route GET /api/equipment/count/:category
// @desc Get equipment count by category (excluding soft-deleted) - This route is specific
// @access Private
app.get('/api/equipment/count/:category', auth, async (req, res) => {
    try {
        const count = await Equipment.countDocuments({
            category: req.params.category,
            isDeleted: { $ne: true }
        });
        res.json({ count });
    } catch (err) {
        console.error('Error in /api/equipment/count/:category:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// 3. General Equipment Routes (More general, placed after specific ones)
// @route GET /api/equipment
// @desc GET all equipment (that is NOT soft-deleted)
// @access Private
app.get('/api/equipment', auth, async (req, res) => {
    try {
        const equipment = await Equipment.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
        res.json(equipment);
    } catch (err) {
        console.error('Error in /api/equipment (GET all):', err.message);
        res.status(500).json({ message: err.message });
    }
});

// @route POST /api/equipment
// @desc Add new equipment
// @access Private (Admin, Editor)
app.post('/api/equipment', [auth, requireRole(['Admin', 'Editor'])], async (req, res) => {
    // Basic validation before creating Equipment instance
    const { assetId, category, status, model, serialNumber, warrantyInfo, location, comment,
            assigneeName, position, employeeEmail, phoneNumber, department, damageDescription, purchasePrice } = req.body;

    // Convert warrantyInfo and purchaseDate to Date objects if they exist
    let parsedWarrantyInfo = null;
    if (warrantyInfo) {
        const mWarranty = moment(warrantyInfo);
        if (mWarranty.isValid()) {
            parsedWarrantyInfo = mWarranty.toDate();
        } else {
            // Handle invalid date string gracefully, maybe send a warning or 400
            console.warn(`POST request: Invalid warrantyInfo date string received: ${warrantyInfo}`);
            // You might want to return an error here: return res.status(400).json({ msg: 'Invalid warrantyInfo date format' });
        }
    }

    let parsedPurchaseDate = null;
    // Assuming purchaseDate might also come in the payload and needs parsing
    if (req.body.purchaseDate) {
        const mPurchaseDate = moment(req.body.purchaseDate);
        if (mPurchaseDate.isValid()) {
            parsedPurchaseDate = mPurchaseDate.toDate();
        } else {
            console.warn(`POST request: Invalid purchaseDate date string received: ${req.body.purchaseDate}`);
        }
    }


    const newEquipment = new Equipment({
        assetId, category, status, model, serialNumber,
        warrantyInfo: parsedWarrantyInfo, // Use parsed Date object
        location, comment, assigneeName, position,
        employeeEmail, phoneNumber, department, damageDescription, purchasePrice,
        purchaseDate: parsedPurchaseDate // Add purchaseDate to schema and here
    });

    try {
        const savedEquipment = await newEquipment.save();
        res.status(201).json(savedEquipment);
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join('. ') });
        }
        if (err.code === 11000) { // Duplicate key error (e.g., assetId)
            return res.status(400).json({ message: 'Duplicate asset ID. An asset with this ID already exists.' });
        }
        console.error('Error in /api/equipment (POST):', err);
        res.status(500).json({ message: 'Server error while creating equipment.' });
    }
});

// @route PUT /api/equipment/:id
// @desc Update existing equipment
// @access Private (Admin, Editor)
app.put('/api/equipment/:id', [auth, requireRole(['Admin', 'Editor'])], async (req, res) => {
    // Clone req.body to safely modify date fields for Mongoose
    const updateData = { ...req.body };

    // Handle incoming date strings for warrantyInfo and purchaseDate
    if (updateData.warrantyInfo) {
        const mWarranty = moment(updateData.warrantyInfo);
        if (mWarranty.isValid()) {
            updateData.warrantyInfo = mWarranty.toDate();
        } else {
            // If invalid date string is sent, set to null or remove the field
            updateData.warrantyInfo = null; // Or undefined to let it default
            console.warn(`PUT request for ${req.params.id}: Invalid warrantyInfo date string received: ${req.body.warrantyInfo}`);
        }
    } else {
        // If warrantyInfo is explicitly null/empty in payload, set it to null in DB
        updateData.warrantyInfo = null;
    }

    if (updateData.purchaseDate) {
        const mPurchaseDate = moment(updateData.purchaseDate);
        if (mPurchaseDate.isValid()) {
            updateData.purchaseDate = mPurchaseDate.toDate();
        } else {
            updateData.purchaseDate = null;
            console.warn(`PUT request for ${req.params.id}: Invalid purchaseDate date string received: ${req.body.purchaseDate}`);
        }
    } else {
        updateData.purchaseDate = null;
    }

    // Ensure damageDescription is cleared if status changes from Damaged
    if (req.body.status !== 'Damaged') {
        updateData.damageDescription = null; // Or undefined
    }

    // Ensure comment is properly handled (if it comes as "null" string, convert to null)
    if (updateData.comment === "null") {
        updateData.comment = null;
    }

    try {
        // Validate the update payload before applying
        const updatedEquipment = await Equipment.findByIdAndUpdate(
            req.params.id,
            updateData, // Use the processed updateData
            { new: true, runValidators: true }
        );

        if (!updatedEquipment) return res.status(404).json({ message: 'Equipment not found' });
        res.json(updatedEquipment);
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join('. ') });
        }
        if (err.code === 11000) { // Duplicate key error (e.g., assetId)
            return res.status(400).json({ message: 'Duplicate asset ID. An asset with this ID already exists.' });
        }
        console.error('Error in /api/equipment/:id (PUT):', err.message, err); // Log full error object
        res.status(500).json({ message: 'Server error during equipment update.' });
    }
});

// @route DELETE /api/equipment/:id
// @desc Soft delete equipment (mark as isDeleted: true)
// @access Private (Admin only)
app.delete('/api/equipment/:id', [auth, requireRole(['Admin'])], async (req, res) => {
    try {
        const softDeletedEquipment = await Equipment.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true }, // Set isDeleted to true
            { new: true } // Return the updated document
        );
        if (!softDeletedEquipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }
        res.json({ message: 'Equipment marked as deleted successfully' });
    } catch (err) {
        console.error('Error in /api/equipment/:id (DELETE):', err.message);
        res.status(500).json({ message: err.message });
    }
});


// --- Server Start ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));