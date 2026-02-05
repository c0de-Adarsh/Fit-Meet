const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const upload = require('../middlewares/upload'); // Use Cloudinary upload middleware

const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
      isActive: true
    })
    .populate('participants', 'firstName photos isOnline lastSeen')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'sender',
        select: 'firstName'
      }
    })
    .sort({ updatedAt: -1 });

    const formattedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const otherUser = conversation.participants.find(
          participant => participant._id.toString() !== userId.toString()
        );
        
       
        const unreadCount = await Message.countDocuments({
          conversation: conversation._id,
          recipient: userId,
          isRead: false
        });

        return {
          id: conversation._id,
          otherUser: {
            id: otherUser._id,
            name: otherUser.firstName,
            profileImage: otherUser.profileImage,
            isOnline: otherUser.isOnline
          },
          lastMessage: conversation.lastMessage,
          unreadCount,
          updatedAt: conversation.updatedAt
        };
      })
    );

    res.json({
      success: true,
      conversations: formattedConversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations'
    });
  }
};

// Get messages for a conversation
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify user is part of this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    const messages = await Message.find({ 
      conversation: conversationId 
    })
    .populate('sender', 'firstName photos')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

    // Mark messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        recipient: userId,
        isRead: false
      },
      { 
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
};

// Send a text message
const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, type = 'text', recipientId } = req.body;
    const senderId = req.user._id;

    // Find or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        participants: senderId
      });
    } else if (recipientId) {
      // Create new conversation
      conversation = await Conversation.findOne({
        participants: { $all: [senderId, recipientId] }
      });

      if (!conversation) {
        // Sort participants to ensure consistent ordering
        const sortedParticipants = [senderId, recipientId].sort();
        conversation = new Conversation({
          participants: sortedParticipants
        });
        await conversation.save();
      }
    }

    if (!conversation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation or recipient'
      });
    }

    const recipient = conversation.participants.find(
      p => p.toString() !== senderId.toString()
    );

    // Create message
    const message = new Message({
      conversation: conversation._id,
      sender: senderId,
      recipient: recipient,
      content,
      type,
      isDelivered: true,
      deliveredAt: new Date()
    });

    await message.save();

    // Update conversation's last message
    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    // Get message with sender info
    const messageWithSender = await Message.findById(message._id)
      .populate('sender', 'firstName photos');

    console.log('Sending message response with sender:', JSON.stringify(messageWithSender, null, 2));

    // Emit socket event (handled by socket middleware)
    if (req.io) {
      req.io.to(`conversation_${conversation._id}`).emit('new-message', messageWithSender);
    }

    res.json({
      success: true,
      message: messageWithSender
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
};

// Send media message (image, video, audio, file)
const sendMediaMessage = async (req, res) => {
  try {
    const { conversationId, recipientId, type } = req.body;
    const senderId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Find or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        participants: senderId
      });
    } else if (recipientId) {
      conversation = await Conversation.findOne({
        participants: { $all: [senderId, recipientId] }
      });

      if (!conversation) {
        // Sort participants to ensure consistent ordering
        const sortedParticipants = [senderId, recipientId].sort();
        conversation = new Conversation({
          participants: sortedParticipants
        });
        await conversation.save();
      }
    }

    if (!conversation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation or recipient'
      });
    }

    const recipient = conversation.participants.find(
      p => p.toString() !== senderId.toString()
    );

    // Cloudinary automatically provides the secure URL
    const mediaUrl = req.file.path; // Cloudinary URL
    let content = '';

    // Set content based on file type
    switch (type) {
      case 'image':
        content = '📷 Photo';
        break;
      case 'video':
        content = '🎥 Video';
        break;
      case 'audio':
        content = '🎵 Voice message';
        break;
      case 'file':
        content = `📎 ${req.file.originalname}`;
        break;
      default:
        content = '📎 File';
    }

    // Create message
    const message = new Message({
      conversation: conversation._id,
      sender: senderId,
      recipient: recipient,
      content,
      type,
      mediaUrl,
      isDelivered: true,
      deliveredAt: new Date()
    });

    await message.save();

    // Update conversation's last message
    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    // Get message with sender info
    const messageWithSender = await Message.findById(message._id)
      .populate('sender', 'firstName photos');

    // Emit socket event
    if (req.io) {
      req.io.to(`conversation_${conversation._id}`).emit('new-message', messageWithSender);
    }

    res.json({
      success: true,
      message: messageWithSender,
      mediaUrl: mediaUrl // Direct Cloudinary URL
    });
  } catch (error) {
    console.error('Error sending media message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send media message',
      error: error.message
    });
  }
};

// Mark messages as read
const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    await Message.updateMany(
      {
        conversation: conversationId,
        recipient: userId,
        isRead: false
      },
      { 
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read'
    });
  }
};

// Delete a message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findOne({
      _id: messageId,
      sender: userId
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or access denied'
      });
    }

    // If message has media, delete the file
    if (message.mediaUrl) {
      const filePath = path.join(__dirname, '../../', message.mediaUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Message.findByIdAndDelete(messageId);

    // Emit socket event
    if (req.io) {
      req.io.to(`conversation_${message.conversation}`).emit('message-deleted', messageId);
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message'
    });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  sendMediaMessage: [upload.single('file'), sendMediaMessage], // Use Cloudinary upload
  markAsRead,
  deleteMessage
};