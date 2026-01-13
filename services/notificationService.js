const Notification = require('../models/notification');
exports.sendNotification = async (userId, message, link = '#', io) => {
  try {
    const notification = await Notification.create({
      userId,
      message,
      link,
    });
    io.to(userId.toString()).emit('newNotification', {
      message,
      link,
      createdAt: notification.createdAt,
    });
    return notification;
  } catch (err) {
    console.error('❌ Notification Error:', err.message);
    return null;
  }
};
