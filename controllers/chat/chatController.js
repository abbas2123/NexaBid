const ChatService = require('../../services/chat/chatService');
const statusCode = require('../../utils/statusCode');
const { ERROR_MESSAGES, VIEWS, LAYOUTS, TITLES } = require('../../utils/constants');
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
    const thread = await ChatService.getOrCreateThread(req.user._id, userId, type, relatedId);
    res.redirect(`/chat/thread/${thread._id}`);
  } catch (err) {
    if (err.message.includes('Chat allowed only after auction ends') ||
      err.message.includes('Only winner and seller can chat') ||
      err.message.includes('Invalid chat participant')) {
      return res.redirect(`/properties/${req.params.relatedId}?error=${encodeURIComponent(err.message)}`);
    }
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
exports.uploadFile = async (req, res) => {
  try {
    const { threadId } = req.params;
    if (!req.file) {
      return res.status(statusCode.BAD_REQUEST).json({ success: false, message: 'No file provided' });
    }
    await ChatService.uploadAndSend(threadId, req.user._id, req.file, req.app.get('io'));
    res.json({ success: true, message: 'File uploaded successfully' });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to upload file' });
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
