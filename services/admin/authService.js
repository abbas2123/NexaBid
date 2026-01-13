const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../../models/user');
const vendorApplication = require('../../models/vendorApplication');
const Property = require('../../models/property');
const Tender = require('../../models/tender');
const ERROR_MESSAGES = require('../../utils/constants').ERROR_MESSAGES;
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
exports.getDashboardStats = async (filters = {}) => {
  try {
    const { timeframe = 'weekly', year, month, category = 'all' } = filters;
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
    const labels = [];
    let iterations = 4;
    let mode = 'weekly';
    let yearFilter = year ? parseInt(year) : null;
    let monthFilter = month ? parseInt(month) : null;
    if (timeframe === 'monthly') {
      mode = 'monthly';
      iterations = 12;
    } else if (timeframe === 'yearly') {
      mode = 'yearly';
      iterations = 5;
    }
    if (yearFilter && monthFilter) {
      mode = 'daily';
      iterations = new Date(yearFilter, monthFilter, 0).getDate();
    }
    if (mode === 'daily') {
      const mIndex = monthFilter - 1;
      for (let i = 1; i <= iterations; i++) {
        const start = new Date(yearFilter, mIndex, i);
        const end = new Date(yearFilter, mIndex, i + 1);
        labels.push(`${i}`);
        let uCount = 0,
          tCount = 0,
          pCount = 0,
          vCount = 0;
        const promises = [];
        if (category === 'all' || category === 'users')
          promises.push(
            User.countDocuments({ createdAt: { $gte: start, $lt: end } }).then((c) => (uCount = c))
          );
        if (category === 'all' || category === 'tenders')
          promises.push(
            Tender.countDocuments({ createdAt: { $gte: start, $lt: end } }).then(
              (c) => (tCount = c)
            )
          );
        if (category === 'all' || category === 'properties')
          promises.push(
            Property.countDocuments({ createdAt: { $gte: start, $lt: end } }).then(
              (c) => (pCount = c)
            )
          );
        if (category === 'all' || category === 'vendors')
          promises.push(
            vendorApplication
              .countDocuments({ createdAt: { $gte: start, $lt: end } })
              .then((c) => (vCount = c))
          );
        await Promise.all(promises);
        userStats.push(uCount);
        tenderStats.push(tCount);
        propertyStats.push(pCount);
        vendorStats.push(vCount);
      }
    } else if (yearFilter && !monthFilter && timeframe === 'monthly') {
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      for (let i = 0; i < 12; i++) {
        const start = new Date(yearFilter, i, 1);
        const end = new Date(yearFilter, i + 1, 1);
        labels.push(months[i]);
        let uCount = 0,
          tCount = 0,
          pCount = 0,
          vCount = 0;
        const promises = [];
        if (category === 'all' || category === 'users')
          promises.push(
            User.countDocuments({ createdAt: { $gte: start, $lt: end } }).then((c) => (uCount = c))
          );
        if (category === 'all' || category === 'tenders')
          promises.push(
            Tender.countDocuments({ createdAt: { $gte: start, $lt: end } }).then(
              (c) => (tCount = c)
            )
          );
        if (category === 'all' || category === 'properties')
          promises.push(
            Property.countDocuments({ createdAt: { $gte: start, $lt: end } }).then(
              (c) => (pCount = c)
            )
          );
        if (category === 'all' || category === 'vendors')
          promises.push(
            vendorApplication
              .countDocuments({ createdAt: { $gte: start, $lt: end } })
              .then((c) => (vCount = c))
          );
        await Promise.all(promises);
        userStats.push(uCount);
        tenderStats.push(tCount);
        propertyStats.push(pCount);
        vendorStats.push(vCount);
      }
    } else {
      for (let i = 0; i < iterations; i++) {
        let start, end, label;
        if (mode === 'weekly') {
          start = new Date();
          start.setDate(start.getDate() - 7 * (i + 1));
          end = new Date();
          end.setDate(end.getDate() - 7 * i);
          const options = { month: 'short', day: 'numeric' };
          label = `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
        } else if (mode === 'monthly') {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const y = d.getFullYear();
          const m = d.getMonth();
          start = new Date(y, m, 1);
          end = new Date(y, m + 1, 1);
          label = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } else if (mode === 'yearly') {
          const y = new Date().getFullYear() - i;
          start = new Date(y, 0, 1);
          end = new Date(y + 1, 0, 1);
          label = `${y}`;
        }
        let uCount = 0,
          tCount = 0,
          pCount = 0,
          vCount = 0;
        const promises = [];
        if (category === 'all' || category === 'users')
          promises.push(
            User.countDocuments({ createdAt: { $gte: start, $lt: end } }).then((c) => (uCount = c))
          );
        if (category === 'all' || category === 'tenders')
          promises.push(
            Tender.countDocuments({ createdAt: { $gte: start, $lt: end } }).then(
              (c) => (tCount = c)
            )
          );
        if (category === 'all' || category === 'properties')
          promises.push(
            Property.countDocuments({ createdAt: { $gte: start, $lt: end } }).then(
              (c) => (pCount = c)
            )
          );
        if (category === 'all' || category === 'vendors')
          promises.push(
            vendorApplication
              .countDocuments({ createdAt: { $gte: start, $lt: end } })
              .then((c) => (vCount = c))
          );
        await Promise.all(promises);
        userStats.unshift(uCount);
        tenderStats.unshift(tCount);
        propertyStats.unshift(pCount);
        vendorStats.unshift(vCount);
        labels.unshift(label);
      }
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
      labels,
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
      title: 'New Tender Published',
      message: `Tender: ${lastTender?.title || 'No tenders'}`,
    },
  ];
};
exports.getPendingTasks = async () => {
  const pendingVendor = await vendorApplication
    .find({ status: 'pending' })
    .limit(5)
    .sort({ createdAt: -1 });
  const pendingProperties = await Property.find({ verificationStatus: 'pending' })
    .limit(5)
    .sort({ createdAt: -1 });
  const tasks = [];
  pendingVendor.forEach((v) => {
    tasks.push({
      name: v.companyDetails?.companyName || 'Unknown Vendor',
      task: 'Vendor Approval',
      status: 'Pending',
      dueDate: new Date(v.createdAt).toLocaleDateString(),
      action: `/admin/vendor-applications`,
    });
  });
  pendingProperties.forEach((p) => {
    tasks.push({
      name: p.title,
      task: 'Property Verification',
      status: 'Pending',
      dueDate: new Date(p.createdAt).toLocaleDateString(),
      action: `/admin/property-management`,
    });
  });
  return tasks;
};
exports.getAllUsers = async (page = 1, filter = {}) => {
  const limit = 10;
  const skip = (page - 1) * limit;
  const query = { role: { $ne: 'admin' } };
  if (filter.search) {
    query.name = { $regex: filter.search, $options: 'i' };
  }
  if (filter.role) query.role = filter.role;
  if (filter.status) query.status = filter.status;
  const users = await User.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit);
  const total = await User.countDocuments(query);
  return {
    users,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
      hasPrevPage: page > 1,
      hasNextPage: page * limit < total,
    },
  };
};
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
