const router = require('express').Router();
const Notification = require('../../models/notification');
const authMiddleware = require('../../middlewares/authMiddleware');
router.get('/', authMiddleware.protectRoute, async (req, res) => {
  if (!req.user) return res.json([]);
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .lean();
  return res.json(notifications);
});
router.post('/mark-read', authMiddleware.protectRoute, async (req, res) => {
  await Notification.deleteMany({ userId: req.user._id });
  res.json({ success: true });
});
module.exports = router;
