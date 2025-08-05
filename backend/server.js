/*********************************************************************
 *  server.js  – Express + MongoDB + JWT
 *  Roles:
 *    • Admin  – full access
 *    • Editor – everything Admin can do EXCEPT create/delete users
 *    • Viewer – read-only (all modifying endpoints return 403)
 *
 *  NEW (role banners):
 *    • Login response returns an `info` string describing the user’s access.
 *    • GET /api/role-info returns `{ role, info }` for banner use on every page.
 *********************************************************************/
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
require('dotenv').config();
const moment   = require('moment');                 // date calculations

const app  = express();
const PORT = process.env.PORT || 5000;

/* ──────────────────────────  Middleware  ────────────────────────── */
app.use(cors());
app.use(express.json());                            // parse application/json

/* ────────────────────  DB / JWT environment vars  ─────────────────*/
const MONGO_URI  = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

/* ───────────────────────  Role constants  ─────────────────────────*/
const ROLES = { ADMIN: 'Admin', EDITOR: 'Editor', VIEWER: 'Viewer' };

const roleMessage = (role) => {
  switch (role) {
    case ROLES.VIEWER:
      return 'You have Viewer access – read-only mode and you will not be able to edit.';
  }
};

/* ─────────────────────────  Schemas / Models  ─────────────────────*/
const UserSchema = new mongoose.Schema({
  email   : { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role    : { type: String, enum: Object.values(ROLES), default: ROLES.VIEWER },
  // resetPasswordToken : String,
  // resetPasswordExpires: Date
});

const EquipmentSchema = new mongoose.Schema({
  assetId   : { type: String, required: true, unique: true },
  category  : { type: String, required: true },
  status    : {
    type: String,
    required: true,
    enum: ['In Use', 'In Stock', 'Damaged', 'E-Waste', 'Removed']
  },
  model            : String,
  serialNumber     : String,
  warrantyInfo     : Date,                 // stored as Date for comparisons
  location         : String,
  comment          : String,
  assigneeName     : String,
  position         : String,
  employeeEmail    : String,
  phoneNumber      : String,
  department       : String,
  damageDescription: String,
  purchasePrice    : { type: Number, default: 0 },
  isDeleted        : { type: Boolean, default: false }
}, { timestamps: true });

const User      = mongoose.model('User',      UserSchema);
const Equipment = mongoose.model('Equipment', EquipmentSchema);

/* ───────────────────────  Seed first Admin  ───────────────────────*/
const seedAdminUser = async () => {
  const ADMIN_EMAIL = 'admin@example.com';
  try {
    const exists = await User.findOne({ email: ADMIN_EMAIL });
    if (!exists) {
      const hash = await bcrypt.hash('password123', 10);
      await User.create({ email: ADMIN_EMAIL, password: hash, role: ROLES.ADMIN });
      console.log('🌱  Admin seeded → admin@example.com / password123');
    }
  } catch (err) { console.error('Seed error:', err); }
};

/* ───────────────────────  MongoDB connect  ────────────────────────*/
mongoose.connect(MONGO_URI)
  .then(() => { console.log('✅  MongoDB connected'); seedAdminUser(); })
  .catch(err => console.error('❌  MongoDB connection error:', err));

/* ───────────────────────  Auth / Role guards  ─────────────────────*/
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token)
    return res.status(401).json({ msg: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user;                       // { id, role, email }
    next();
  } catch {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role))
    return res.status(403).json({ msg: 'Access denied. Insufficient role.' });
  next();
};

/* ─────────────────────────────  ROUTES  ───────────────────────────*/

/* =========================  USER ROUTES  ========================= */
app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ msg: 'Invalid credentials' });

    const payload = { user: { id: user.id, role: user.role, email: user.email } };
    jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' }, (err, token) => {
      if (err) throw err;
      res.json({
        token,
        user: payload.user,
        info: roleMessage(user.role)           // banner text for front-end
      });
    });
  } catch (err) { console.error(err); res.status(500).send('Server error'); }
});

app.get('/api/users',
  [auth, requireRole([ROLES.ADMIN])],
  async (req, res) => {
    try {
      const users = await User.find().select('-password');
      res.json(users);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
  }
);

app.post('/api/users/create',
  [auth, requireRole([ROLES.ADMIN])],
  async (req, res) => {
    const { email, password, role } = req.body;
    try {
      if (await User.findOne({ email }))
        return res.status(400).json({ msg: 'User already exists' });

      const hash = await bcrypt.hash(password, 10);
      await User.create({ email, password: hash, role });
      res.json({ msg: 'User created successfully' });
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
  }
);

app.delete('/api/users/:id',
  [auth, requireRole([ROLES.ADMIN])],
  async (req, res) => {
    try {
      if (req.params.id === req.user.id)
        return res.status(400).json({ msg: 'Cannot delete your own account' });

      const deletedUser = await User.findByIdAndRemove(req.params.id);
      if (!deletedUser) return res.status(404).json({ msg: 'User not found' });

      res.json({ msg: 'User deleted' });
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
  }
);

/* banner-only helper so React can fetch on each page load */
app.get('/api/role-info', auth, (req, res) => {
  res.json({ role: req.user.role, info: roleMessage(req.user.role) });
});

/* ===================  DASHBOARD SUMMARY ROUTES  =================== */
app.get('/api/equipment/summary', auth, async (req, res) => {
  try {
    const totalAssets = await Equipment.countDocuments({ isDeleted: { $ne: true } });
    const inUse       = await Equipment.countDocuments({ status: 'In Use',  isDeleted: { $ne: true } });
    const inStock     = await Equipment.countDocuments({ status: 'In Stock',isDeleted: { $ne: true } });
    const damaged     = await Equipment.countDocuments({ status: 'Damaged', isDeleted: { $ne: true } });
    const eWaste      = await Equipment.countDocuments({ status: 'E-Waste', isDeleted: { $ne: true } });

    const removed = await Equipment.countDocuments({
      $or: [
        { status: { $in: ['E-Waste', 'Damaged', 'Removed'] } },
        { isDeleted: true }
      ]
    });

    res.json({ totalAssets, inUse, inStock, damaged, eWaste, removed });
  } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

app.get('/api/equipment/total-value', auth, async (req, res) => {
  try {
    const result = await Equipment.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$purchasePrice' } } }
    ]);
    const totalValue = result.length ? result[0].total : 0;
    res.json({ totalValue });
  } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

app.get('/api/equipment/expiring-warranty', auth, async (req, res) => {
  try {
    const thirtyDaysFromNow = moment().add(30, 'days').toDate();
    const now = new Date();

    const expiringItems = await Equipment.find({
      warrantyInfo: { $exists: true, $ne: null, $type: 9, $gte: now, $lte: thirtyDaysFromNow },
      status: { $nin: ['E-Waste', 'Damaged', 'Removed'] },
      isDeleted: { $ne: true }
    }).select('model serialNumber warrantyInfo');

    res.json(expiringItems);
  } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

app.get('/api/equipment/grouped-by-email', auth, async (req, res) => {
  try {
    const groupedData = await Equipment.aggregate([
      { $match: { status: 'In Use', isDeleted: { $ne: true } } },
      { $group: {
          _id: '$employeeEmail',
          assigneeName : { $first: '$assigneeName' },
          position     : { $first: '$position' },
          phoneNumber  : { $first: '$phoneNumber' },
          department   : { $first: '$department' },
          assets: { $push: {
            _id: '$_id',
            assetId       : '$assetId',
            category      : '$category',
            status        : '$status',
            model         : '$model',
            serialNumber  : '$serialNumber',
            warrantyInfo  : '$warrantyInfo',
            location      : '$location',
            comment       : '$comment',
            damageDescription: '$damageDescription',
            purchasePrice : '$purchasePrice',
            createdAt     : '$createdAt',
            updatedAt     : '$updatedAt'
          }},
          count: { $sum: 1 }
      }},
      { $project: {
          _id: 0,
          employeeEmail: '$_id',
          assigneeName : 1,
          position     : 1,
          phoneNumber  : 1,
          department   : 1,
          assets       : 1,
          count        : 1
      }},
      { $sort: { employeeEmail: 1 } }
    ]);
    res.json(groupedData);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

app.get('/api/equipment/removed', auth, async (req, res) => {
  try {
    const removed = await Equipment.find({
      $or: [
        { status: { $in: ['E-Waste', 'Damaged', 'Removed'] } },
        { isDeleted: true }
      ]
    }).sort({ updatedAt: -1 });
    res.json(removed);
  } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

/* ===================  EQUIPMENT GENERAL GET  ===================== */
app.get('/api/equipment', auth, async (req, res) => {
  try {
    const equipment = await Equipment.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.json(equipment);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

app.get('/api/equipment/count/:category', auth, async (req, res) => {
  try {
    const count = await Equipment.countDocuments({
      category: req.params.category,
      isDeleted: { $ne: true }
    });
    res.json({ count });
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

/* ===================  EQUIPMENT CREATE  ========================= */
app.post('/api/equipment',
  [auth, requireRole([ROLES.ADMIN, ROLES.EDITOR])],
  async (req, res) => {
    const {
      assetId, category, status, model, serialNumber, warrantyInfo, location, comment,
      assigneeName, position, employeeEmail, phoneNumber, department,
      damageDescription, purchasePrice
    } = req.body;

    let parsedWarrantyInfo = null;
    if (warrantyInfo) {
      const mWarranty = moment(warrantyInfo);
      if (mWarranty.isValid()) parsedWarrantyInfo = mWarranty.toDate();
      else console.warn(`POST: Invalid warrantyInfo: ${warrantyInfo}`);
    }

    let parsedPurchaseDate = null;
    if (req.body.purchaseDate) {
      const mPurchase = moment(req.body.purchaseDate);
      if (mPurchase.isValid()) parsedPurchaseDate = mPurchase.toDate();
      else console.warn(`POST: Invalid purchaseDate: ${req.body.purchaseDate}`);
    }

    const newEquipment = new Equipment({
      assetId, category, status, model, serialNumber,
      warrantyInfo: parsedWarrantyInfo,
      location, comment, assigneeName, position,
      employeeEmail, phoneNumber, department, damageDescription, purchasePrice,
      purchaseDate: parsedPurchaseDate
    });

    try {
      const saved = await newEquipment.save();
      res.status(201).json(saved);
    } catch (err) {
      if (err.name === 'ValidationError') {
        const msg = Object.values(err.errors).map(v => v.message).join('. ');
        return res.status(400).json({ message: msg });
      }
      if (err.code === 11000) {
        return res.status(400).json({ message: 'Duplicate asset ID' });
      }
      console.error(err);
      res.status(500).json({ message: 'Server error while creating equipment.' });
    }
  }
);

/* ===================  EQUIPMENT UPDATE  ========================= */
app.put('/api/equipment/:id',
  [auth, requireRole([ROLES.ADMIN, ROLES.EDITOR])],
  async (req, res) => {
    const updateData = { ...req.body };

    if (updateData.warrantyInfo) {
      const mW = moment(updateData.warrantyInfo);
      updateData.warrantyInfo = mW.isValid() ? mW.toDate() : null;
    } else {
      updateData.warrantyInfo = null;
    }

    if (updateData.purchaseDate) {
      const mP = moment(updateData.purchaseDate);
      updateData.purchaseDate = mP.isValid() ? mP.toDate() : null;
    } else {
      updateData.purchaseDate = null;
    }

    if (req.body.status !== 'Damaged') updateData.damageDescription = null;
    if (updateData.comment === 'null') updateData.comment = null;

    try {
      const updated = await Equipment.findByIdAndUpdate(
        req.params.id, updateData, { new: true, runValidators: true }
      );
      if (!updated) return res.status(404).json({ message: 'Equipment not found' });
      res.json(updated);
    } catch (err) {
      if (err.name === 'ValidationError') {
        const msg = Object.values(err.errors).map(v => v.message).join('. ');
        return res.status(400).json({ message: msg });
      }
      if (err.code === 11000) {
        return res.status(400).json({ message: 'Duplicate asset ID' });
      }
      console.error(err);
      res.status(500).json({ message: 'Server error during equipment update.' });
    }
  }
);

/* ===================  EQUIPMENT SOFT-DELETE  ===================== */
app.delete('/api/equipment/:id',
  [auth, requireRole([ROLES.ADMIN])],
  async (req, res) => {
    try {
      const softDeleted = await Equipment.findByIdAndUpdate(
        req.params.id, { isDeleted: true }, { new: true }
      );
      if (!softDeleted) return res.status(404).json({ message: 'Equipment not found' });
      res.json({ message: 'Equipment marked as deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
);

/* ─────────────────────────  Server Start  ─────────────────────────*/
app.listen(PORT, () => console.log(`🚀  Server running on port ${PORT}`));
