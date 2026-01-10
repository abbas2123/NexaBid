const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../models/user');
const Property = require('../../models/property');
const Tender = require('../../models/tender');
const vendorApplication = require('../../models/vendorApplication');
const { ERROR_MESSAGES } = require('../../utils/constants');

exports.adminLogin = async (email, password) => {
  const admin = await User.findOne({ email, role: 'admin' });
  if (!admin) throw new Error(ERROR_MESSAGES.ADMIN_NOT_FOUND);

  const isMatch = await bcrypt.compare(password, admin.passwordHash);
  if (!isMatch) throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);

  const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  return {
    token,
    admin,
  };
};

exports.getDashboardStats = async () => {
  try {
    const pendingVendor = await vendorApplication.countDocuments({
      status: 'pending',
    });

    const pendingProperties = await Property.countDocuments({
      verificationStatus: 'pending',
    });

    const activeTender = await Tender.countDocuments({
      status: 'published',
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });
    const userStats = [];
    const tenderStats = [];
    const propertyStats = [];
    const vendorStats = [];

    for (let i = 0; i < 4; i++) {
      const start = new Date();
      start.setDate(start.getDate() - 7 * (i + 1));
      const end = new Date();
      end.setDate(end.getDate() - 7 * i);

      const [uCount, tCount, pCount, vCount] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: start, $lt: end } }),
        Tender.countDocuments({ createdAt: { $gte: start, $lt: end } }),
        Property.countDocuments({ createdAt: { $gte: start, $lt: end } }),
        vendorApplication.countDocuments({ createdAt: { $gte: start, $lt: end } }),
      ]);

      userStats.unshift(uCount);
      tenderStats.unshift(tCount);
      propertyStats.unshift(pCount);
      vendorStats.unshift(vCount);
    }

    return {
      pendingVendor,
      pendingProperties,
      activeTender,
      recentUsers,
      userStats,
      tenderStats,
      propertyStats,
      vendorStats,
    };
  } catch (err) {
    console.error('Dashboard service Error:', err);
    throw new Error(ERROR_MESSAGES.FAILED_LOAD_DASHBOARD_STATS);
  }
};

exports.getRecentActivities = async () => {
  const lastUser = await User.findOne().sort({ createdAt: -1 });
  const lastProperty = await Property.findOne().sort({ createdAt: -1 });
  const lastTender = await Tender.findOne().sort({ createdAt: -1 });

  return [
    {
      title: 'New User Registered',
      message: `User: ${lastUser?.name || 'No users'}`,
    },
    {
      title: 'Property Listed',
      message: `Property: ${lastProperty?.title || 'No properties'}`,
    },
    {
      title: 'Tender Created',
      message: `Tender: ${lastTender?.title || 'No tenders'}`,
    },
  ];
};

exports.getPendingTasks = async () => {
  const tasks = [];


  const vendors = await vendorApplication
    .find({ status: { $in: ['pending', 'submitted'] } })
    .sort({ createdAt: -1 })
    .limit(1);

  vendors.forEach((v) => {
    tasks.push({
      task: 'Vendor Application',
      name: v.businessName,
      status: 'Pending',
      dueDate: v.createdAt.toISOString().split('T')[0],
      action: `/admin/vendor/${v._id}`,
    });
  });


  const properties = await Property.find({ verificationStatus: 'pending' })
    .sort({ createdAt: -1 })
    .limit(5);

  properties.forEach((p) => {
    tasks.push({
      task: 'Property Verification',
      name: p.title,
      status: 'Pending',
      dueDate: p.createdAt.toISOString().split('T')[0],
      action: `/admin/property/${p._id}`,
    });
  });


  const tenders = await Tender.find({ status: 'draft' }).sort({ createdAt: -1 }).limit(5);

  tenders.forEach((t) => {
    tasks.push({
      task: 'Tender Finalization',
      name: t.title,
      status: 'In Progress',
      dueDate: t.createdAt.toISOString().split('T')[0],
      action: `/admin/tender/${t._id}`,
    });
  });

  return tasks;
};

exports.getAllUsers = async () =>
  await User.find({ role: { $ne: 'admin' } }).sort({ createdAt: -1 });

exports.blockUser = async (userId, req) => {
  const user = await User.findByIdAndUpdate(userId, { status: 'blocked' }, { new: true });

  if (user) {
    const io = req.app.get('io');
    console.log('🚨 Forcing logout of:', userId);

    io.to(userId.toString()).emit('forceLogout', {
      message: ERROR_MESSAGES.ACCOUNT_BLOCKED_BY_ADMIN,
    });
  }

  return user;
};

exports.unblockUser = async (userId) =>
  await User.findByIdAndUpdate(userId, { status: 'active' }, { new: true });
