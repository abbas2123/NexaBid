

const ChatService = require('../../services/chat/chatService');
const statusCode = require('../../utils/statusCode');
const { ERROR_MESSAGES, VIEWS, LAYOUTS, TITLES } = require('../../utils/constants');
const Property = require('../../models/property');

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
        // Rule 1: Chat allowed only after auction ends
        if (new Date() < property.auctionEndsAt) {
          // You might want to flash an error or handle this more gracefully
          return res.redirect(`/properties/${relatedId}?error=Chat allowed only after auction ends`);
        }

        // Rule 2: Restrict to Winner <-> Seller
        const isSeller = property.sellerId.toString() === req.user._id.toString();
        const isWinner = property.currentHighestBidder && property.currentHighestBidder.toString() === req.user._id.toString();

        if (!isSeller && !isWinner) {
          return res.redirect(`/properties/${relatedId}?error=Only winner and seller can chat`);
        }

        // Ensure the target user is the correct counterparty
        const targetIsSeller = property.sellerId.toString() === userId.toString();
        const targetIsWinner = property.currentHighestBidder && property.currentHighestBidder.toString() === userId.toString();

        if ((isSeller && !targetIsWinner) || (isWinner && !targetIsSeller)) {
          return res.redirect(`/properties/${relatedId}?error=Invalid chat participant`);
        }
      }
    } else if (type === 'tender') {
      // For tenders, we might want to restrict to issuer and participants, 
      // but for now, we'll allow it to proceed to getOrCreateThread
      // verify relatedId exists if needed
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
      return res.redirect();
    }

    await ChatService.send({
      threadId,
      senderId: req.user._id,
      message: message.trim(),
    }, req.app.get('io'));

    res.redirect(`/chat/thread/${threadId}`);
  } catch (err) {
    next(err);
  }
};

exports.uploadFile = async (req, res, next) => {
  try {
    const { threadId } = req.params;
    if (!req.file) return res.redirect();

    const fileUrl = req.file.path;

    await ChatService.send({
      threadId,
      senderId: req.user._id,
      message: null,
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
    }, req.app.get('io'));

    res.redirect(`/chat/thread/${threadId}`);
  } catch (err) {
    next(err);
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
