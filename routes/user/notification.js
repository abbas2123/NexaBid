const router = require('express').Router();
const Notification = require('../../models/notification');
const authMiddleware = require('../../middlewares/authMiddleware');

router.get('/', authMiddleware.protectRoute, async (req, res) => {
  if (!req.user) return res.json({ success: true, notifications: [], pagination: {} });
  const page = Number(req.query.page) || 1;
  const limit = 1;
  const skip = (page - 1) * limit;

  const total = await Notification.countDocuments({ userId: req.user._id });
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  const totalPages = Math.ceil(total / limit);

  let pagination = {
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };

  return res.json({ success: true, notifications, pagination, unreadCount });
});
router.post('/mark-read', authMiddleware.protectRoute, async (req, res) => {
  await Notification.deleteMany({ userId: req.user._id });
  res.json({ success: true });
});
module.exports = router;
