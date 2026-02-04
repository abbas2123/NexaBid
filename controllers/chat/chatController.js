const ChatService = require('../../services/chat/chatService');
const statusCode = require('../../utils/statusCode');
const { ERROR_MESSAGES, VIEWS, LAYOUTS, TITLES } = require('../../utils/constants');
const Property = require('../../models/property');
const { uploadToCloudinary } = require('../../utils/cloudinaryHelper');
exports.openInbox = async (req, res, next) => {
  try {
    const threads = await ChatService.getInbox(req.user._id);
    res.render(VIEWS.CHAT, {
      layout: LAYOUTS.USER_LAYOUT,
      title: TITLES.CHAT,
      threads,
      thread: null,
      messages: [],
      otherUser: null,
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
};
exports.startChat = async (req, res, next) => {
  try {
    const { userId, type, relatedId } = req.params;
    if (type === 'property') {
      const property = await Property.findById(relatedId);
      if (property && property.isAuction) {
        if (new Date() < property.auctionEndsAt) {
          return res.redirect(
            `/properties/${relatedId}?error=Chat allowed only after auction ends`
          );
        }
        const isSeller = property.sellerId.toString() === req.user._id.toString();
        const isWinner =
          property.currentHighestBidder &&
          property.currentHighestBidder.toString() === req.user._id.toString();
        if (!isSeller && !isWinner) {
          return res.redirect(`/properties/${relatedId}?error=Only winner and seller can chat`);
        }
        const targetIsSeller = property.sellerId.toString() === userId.toString();
        const targetIsWinner =
          property.currentHighestBidder &&
          property.currentHighestBidder.toString() === userId.toString();
        if ((isSeller && !targetIsWinner) || (isWinner && !targetIsSeller)) {
          return res.redirect(`/properties/${relatedId}?error=Invalid chat participant`);
        }
      }
    }
    const thread = await ChatService.getOrCreateThread(req.user._id, userId, type, relatedId);
    res.redirect(`/chat/thread/${thread._id}`);
  } catch (err) {
    next(err);
  }
};
exports.openThread = async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const thread = await ChatService.getThread(threadId, req.user._id);
    if (!thread) return res.redirect('/chat');
    const messages = await ChatService.getMessages(threadId);
    const threads = await ChatService.getInbox(req.user._id);
    res.render(VIEWS.CHAT, {
      layout: LAYOUTS.USER_LAYOUT,
      title: TITLES.CHAT,
      threads,
      thread,
      otherUser: thread.other,
      messages,
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
};
exports.postMessage = async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.redirect(`/chat/thread/${threadId}`);
    }
    await ChatService.send(
      {
        threadId,
        senderId: req.user._id,
        message: message.trim(),
      },
      req.app.get('io')
    );
    res.redirect(`/chat/thread/${threadId}`);
  } catch (err) {
    next(err);
  }
};
exports.uploadFile = async (req, res, next) => {
  try {
    const { threadId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }
    let fileUrl = null;
    let fileType = 'text';
    if (req.file) {
      if (req.file.buffer) {
        const cld = await uploadToCloudinary(
          req.file.buffer,
          'nexabid/chat',
          req.file.originalname,
          'auto'
        );
        fileUrl = cld.secure_url;
      } else {
        fileUrl = req.file.path;
      }
      const mime = req.file.mimetype;
      if (mime.startsWith('image/')) fileType = 'image';
      else if (mime.startsWith('video/')) fileType = 'video';
      else if (mime.startsWith('audio/')) fileType = 'audio';
      else fileType = 'file';
    }
    await ChatService.send(
      {
        threadId,
        senderId: req.user._id,
        message: null,
        fileUrl,
        fileName: req.file.originalname,
        fileType: fileType,
      },
      req.app.get('io')
    );
    res.json({ success: true, message: 'File uploaded successfully' });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ success: false, message: 'Failed to upload file' });
  }
};
exports.unreaded = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const totalUnread = await ChatService.getUnreadCount(userId);
    res.json({ success: true, count: totalUnread });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, error: ERROR_MESSAGES.SERVER_ERROR });
  }
};
