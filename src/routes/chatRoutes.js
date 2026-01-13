const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);


router.get('/conversations', chatController.getConversations);


router.get('/messages/:conversationId', chatController.getMessages);


router.post('/send-message', chatController.sendMessage);


router.post('/send-media', chatController.sendMediaMessage);


router.put('/mark-read/:conversationId', chatController.markAsRead);


router.delete('/message/:messageId', chatController.deleteMessage);

module.exports = router;