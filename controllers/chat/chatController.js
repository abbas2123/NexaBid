const ChatService = require('../../services/chat/chatService');
const ChatThread = require('../../models/chatThread');

exports.openInbox = async (req, res, next) => {
  try {
    const threads = await ChatService.getInbox(req.user._id);

    res.render('chat/chat', {
      layout: 'layouts/user/userLayout',
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

    const thread = await ChatService.getOrCreateThread(
      req.user._id,
      userId,
      type,
      relatedId
    );

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

    res.render('chat/chat', {
      layout: 'layouts/user/userLayout',
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

    await ChatService.send({
      threadId,
      senderId: req.user._id,
      message: message.trim(),
    });

    res.redirect(`/chat/thread/${threadId}`);
  } catch (err) {
    next(err);
  }
};

exports.uploadFile = async (req, res, next) => {
  try {
    const { threadId } = req.params;
    if (!req.file) return res.redirect(`/chat/thread/${threadId}`);

    const fileUrl = `/uploads/chat/${req.file.filename}`;

    await ChatService.send({
      threadId,
      senderId: req.user._id,
      message: null,
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
    });

    res.redirect(`/chat/thread/${threadId}`);
  } catch (err) {
    next(err);
  }
};

exports.unreaded = async (req, res) => {
  try {
    const userId = req.user._id.toString();
console.log('userId',userId)
    const threads = await ChatThread.find({
      participants: userId,
    });

    let totalUnread = 0;
    threads.forEach((thread) => {
      const unreadCount = thread.unreadCounts?.get(userId) || 0;
      totalUnread += unreadCount;
    });

    res.json({ success: true, count: totalUnread });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
