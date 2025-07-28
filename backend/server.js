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
    role: { type: String, enum: ['Admin', 'Editor', 'Viewer'], default: 'Viewer' }
});

const EquipmentSchema = new mongoose.Schema({
    assetId: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    status: { type: String, required: true, enum: ['In Use', 'In Stock', 'Damaged', 'E-Waste', 'Removed'] },
    model: { type: String },
    serialNumber: { type: String },
    warrantyInfo: { type: String }, // Storing as string to keep it flexible for Moment.js parsing
    location: { type: String },
    comment: { type: String },
    assigneeName: { type: String },
    position: { type: String },
    employeeEmail: { type: String },
    phoneNumber: { type: String },
    department: { type: String },
    damageDescription: { type: String },
    purchasePrice: { type: Number, default: 0 }, // Crucial for total value calculation
    isDeleted: {
        type: Boolean,
        default: false
    },
    removalDate: {
        type: Date,
        required: false
    },
    originalStatus: {
        type: String,
        required: false
    },
    // *** ADDED THIS FIELD: To store who removed the asset ***
    removedByEmail: {
        type: String,
        required: false // Not required if status is not 'Removed'
    }
}, { timestamps: true });

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
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user; // Attach user info (id, role, email) to request
        next();
    } catch (e) {
        res.status(400).json({ msg: 'Token is not valid' });
    }
};

const requireRole = (roles) => (req, res, next) => {
    // Ensure req.user and req.user.role exist before checking
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ msg: 'Access denied. Insufficient role.' });
    }
    next();
};

// --- API Endpoints ---

// --- User Endpoints ---
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

app.delete('/api/users/:id', [auth, requireRole(['Admin'])], async (req, res) => {
    try {
        // Prevent deleting the currently logged-in admin or the seeded admin
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

// 1. Dashboard Specific Summary Endpoints (Most Specific paths first)
// @route   GET /api/equipment/summary
// @desc    Get summary counts for dashboard
// @access  Private
app.get('/api/equipment/summary', auth, async (req, res) => {
    try {
        // Exclude 'Removed' status from general dashboard counts if desired
        const totalAssets = await Equipment.countDocuments({ isDeleted: { $ne: true }, status: { $ne: 'Removed' } });
        const inUse = await Equipment.countDocuments({ status: 'In Use', isDeleted: { $ne: true } });
        const available = await Equipment.countDocuments({ status: 'In Stock', isDeleted: { $ne: true } });
        const damaged = await Equipment.countDocuments({ status: 'Damaged', isDeleted: { $ne: true } });
        const eWaste = await Equipment.countDocuments({ status: 'E-Waste', isDeleted: { $ne: true } });

        res.json({
            totalAssets,
            inUse,
            available,
            damaged,
            eWaste,
        });
    } catch (err) {
        console.error('Error in /api/equipment/summary:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/equipment/total-value
// @desc    Calculate total value of assets (excluding soft-deleted and removed)
// @access  Private
app.get('/api/equipment/total-value', auth, async (req, res) => {
    try {
        const result = await Equipment.aggregate([
            { $match: { isDeleted: { $ne: true }, status: { $ne: 'Removed' } } }, // Only consider non-deleted and non-removed items
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
// @desc    Get assets with warranty expiring in 30 days (excluding E-Waste, Damaged, and Removed)
// @access  Private
app.get('/api/equipment/expiring-warranty', auth, async (req, res) => {
    try {
        const thirtyDaysFromNow = moment().add(30, 'days').toDate();

        const expiringItems = await Equipment.find({
            warrantyInfo: { $ne: null, $lte: thirtyDaysFromNow }, // Not null and less than or equal to 30 days from now
            status: { $nin: ['E-Waste', 'Damaged', 'Removed'] }, // Exclude these statuses from warranty alerts
            isDeleted: { $ne: true } // Also exclude soft-deleted items
        }).select('model serialNumber warrantyInfo'); // Select only necessary fields

        res.json(expiringItems);
    } catch (err) {
        console.error('Error in /api/equipment/expiring-warranty:', err.message);
        res.status(500).send('Server Error');
    }
});

// 2. Specific Dynamic Routes (should come before the general /api/equipment/:id)
// @route   GET /api/equipment/count/:category
// @desc    Get equipment count by category (excluding soft-deleted and removed)
// @access  Private
app.get('/api/equipment/count/:category', auth, async (req, res) => {
    try {
        const count = await Equipment.countDocuments({
            category: req.params.category,
            isDeleted: { $ne: true }, // Exclude deleted items
            status: { $ne: 'Removed' } // Exclude removed items from general counts
        });
        res.json({ count });
    } catch (err) {
        console.error('Error in /api/equipment/count/:category:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// NEW ROUTE: Get all assets with status 'Removed'
// IMPORTANT: This must be before app.get('/api/equipment/:id') and app.get('/api/equipment')
app.get('/api/equipment/removed', auth, async (req, res) => {
    try {
        const removedAssets = await Equipment.find({ status: 'Removed' });
        res.json(removedAssets);
    } catch (err) {
        console.error('Error in /api/equipment/removed:', err.message);
        res.status(500).send('Server Error');
    }
});


// 3. General Equipment Routes (More general, placed after specific ones)
// GET all equipment (that is NOT soft-deleted and NOT 'Removed')
app.get('/api/equipment', auth, async (req, res) => {
    try {
        const equipment = await Equipment.find({ isDeleted: { $ne: true }, status: { $ne: 'Removed' } }).sort({ createdAt: -1 });
        res.json(equipment);
    } catch (err) {
        console.error('Error in /api/equipment (GET all):', err.message);
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/equipment', [auth, requireRole(['Admin', 'Editor'])], async (req, res) => {
    const newEquipment = new Equipment(req.body);
    try {
        const savedEquipment = await newEquipment.save();
        res.status(201).json(savedEquipment);
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join('. ') });
        }
        console.error('Error in /api/equipment (POST):', err); // Log full error for POST
        res.status(500).json({ message: 'Server error while creating equipment.' });
    }
});

app.put('/api/equipment/:id', [auth, requireRole(['Admin', 'Editor'])], async (req, res) => {
    try {
        const { status, removalDate, originalStatus, ...otherFields } = req.body; // Destructure new fields

        let updateFields = { ...otherFields };

        // Handle 'Removed' status specific fields
        if (status === 'Removed') {
            updateFields.status = 'Removed';
            updateFields.removalDate = removalDate;
            updateFields.originalStatus = originalStatus;
            updateFields.isDeleted = false; // Ensure it's not soft-deleted if explicitly 'Removed'
            // *** ADDED THIS LOGIC: Save the email of the user who performed the removal ***
            if (req.user && req.user.email) {
                updateFields.removedByEmail = req.user.email;
            } else {
                // Fallback or error if user email not available (shouldn't happen with auth)
                updateFields.removedByEmail = 'Unknown User';
            }
        } else {
            // If status is changed from 'Removed' to something else, clear removal info
            updateFields.status = status;
            updateFields.removalDate = undefined; // Clear the field
            updateFields.originalStatus = undefined; // Clear the field
            updateFields.removedByEmail = undefined; // *** Clear this field too ***
        }

        const updatedEquipment = await Equipment.findByIdAndUpdate(
            req.params.id,
            updateFields, // Use the constructed updateFields object
            { new: true, runValidators: true }
        );

        if (!updatedEquipment) return res.status(404).json({ message: 'Equipment not found' });
        res.json(updatedEquipment);
    } catch (err) {
        if (err.name === 'ValidationError') { // Handle validation errors on PUT
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join('. ') });
        }
        console.error('Error in /api/equipment/:id (PUT):', err.message);
        res.status(500).json({ message: err.message });
    }
});

// Original DELETE route (soft delete) - this marks as isDeleted: true
app.delete('/api/equipment/:id', [auth, requireRole(['Admin'])], async (req, res) => {
    try {
        const softDeletedEquipment = await Equipment.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true },
            { new: true }
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

app.get('/api/equipment/grouped-by-email', auth, async (req, res) => {
  try {
    const groupedData = await Equipment.aggregate([
      { $match: { status: "In Use", isDeleted: { $ne: true } } }, // Only non-deleted In Use assets
      {
        $group: {
          _id: "$employeeEmail",
          assets: { $push: "$$ROOT" },
          count: { $sum: 1 }
        }
      }
    ]);
    res.json(groupedData);
  } catch (error) {
    console.error('Error fetching grouped assets by email:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- Server Start ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));