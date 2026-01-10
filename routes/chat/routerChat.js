

const router = require('express').Router();
const chat = require('../../controllers/chat/chatController');
const authModule = require('../../middlewares/authMiddleware');
const uploadFactory = require('../../middlewares/upload');
const upload = uploadFactory('nexabid/chat');

const protectRoute = authModule.protectRoute || authModule;

router.get('/', protectRoute, chat.openInbox);
router.get('/start/:userId/:type/:relatedId', protectRoute, chat.startChat);
router.get('/thread/:threadId', protectRoute, chat.openThread);

router.post('/thread/:threadId/send', protectRoute, chat.postMessage);
router.post('/thread/:threadId/upload', protectRoute, upload.single('file'), chat.uploadFile);

router.get('/unread-count', protectRoute, chat.unreaded);

module.exports = router;
