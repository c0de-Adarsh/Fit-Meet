const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userId
    
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    const userId = socket.userId;
    console.log(`User ${userId} connected with socket ${socket.id}`);

    // Store user connection
    this.connectedUsers.set(userId, socket.id);
    this.userSockets.set(socket.id, userId);

    // Update user online status
    this.updateUserOnlineStatus(userId, true);

    // Join user to their personal room
    socket.join(`user_${userId}`);

    // Handle joining conversation rooms
    socket.on('join-conversation', async (conversationId) => {
      try {
        // Verify user is part of this conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId
        });

        if (conversation) {
          socket.join(`conversation_${conversationId}`);
          console.log(`User ${userId} joined conversation ${conversationId}`);
        }
      } catch (error) {
        console.error('Error joining conversation:', error);
      }
    });

    // Handle sending messages
    socket.on('send-message', async (data) => {
      try {
        const { conversationId, content, type = 'text', recipientId, mediaUrl } = data;

        // Find or create conversation
        let conversation;
        if (conversationId) {
          conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
          });
        } else if (recipientId) {
          conversation = await Conversation.findOne({
            participants: { $all: [userId, recipientId] }
          });

          if (!conversation) {
            conversation = new Conversation({
              participants: [userId, recipientId]
            });
            await conversation.save();
          }
        }

        if (!conversation) {
          socket.emit('error', { message: 'Invalid conversation' });
          return;
        }

        const recipient = conversation.participants.find(
          p => p.toString() !== userId
        );

        // Create message
        const message = new Message({
          conversation: conversation._id,
          sender: userId,
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

        // Emit to conversation room
        this.io.to(`conversation_${conversation._id}`).emit('new-message', messageWithSender);

        // Send push notification to recipient if offline
        const recipientSocketId = this.connectedUsers.get(recipient.toString());
        if (!recipientSocketId) {
          // Send push notification (implement with FCM or similar)
          this.sendPushNotification(recipient, {
            title: `${socket.user.firstName}`,
            body: content || 'Sent a media file',
            data: {
              type: 'new_message',
              conversationId: conversation._id.toString(),
              senderId: userId
            }
          });
        }

        // Confirm message delivery
        socket.emit('message-delivered', message._id);

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit('user-typing', {
        userId,
        userName: socket.user.firstName,
        isTyping: true
      });
    });

    socket.on('typing-stop', (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit('user-typing', {
        userId,
        userName: socket.user.firstName,
        isTyping: false
      });
    });

    // Handle message read receipts
    socket.on('mark-messages-read', async (data) => {
      try {
        const { conversationId } = data;

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

        // Notify sender about read receipts
        socket.to(`conversation_${conversationId}`).emit('messages-read', {
          conversationId,
          readBy: userId
        });

      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle call events
    socket.on('initiate-call', (data) => {
      const { recipientId, callType, channelName } = data;
      const recipientSocketId = this.connectedUsers.get(recipientId);
      
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('incoming-call', {
          callerId: userId,
          callerName: socket.user.firstName,
          callerImage: socket.user.profileImage,
          callType,
          channelName
        });
      }
    });

    socket.on('call-response', (data) => {
      const { callerId, accepted, channelName } = data;
      const callerSocketId = this.connectedUsers.get(callerId);
      
      if (callerSocketId) {
        this.io.to(callerSocketId).emit('call-response', {
          recipientId: userId,
          accepted,
          channelName
        });
      }
    });

    socket.on('end-call', (data) => {
      const { recipientId, channelName } = data;
      const recipientSocketId = this.connectedUsers.get(recipientId);
      
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('call-ended', {
          endedBy: userId,
          channelName
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
      
      // Remove user from connected users
      this.connectedUsers.delete(userId);
      this.userSockets.delete(socket.id);

      // Update user online status
      this.updateUserOnlineStatus(userId, false);
    });
  }

  async updateUserOnlineStatus(userId, isOnline) {
    try {
      await User.findByIdAndUpdate(userId, { 
        isOnline,
        lastSeen: new Date()
      });

      // Notify user's contacts about status change
      this.io.emit('user-status-changed', {
        userId,
        isOnline,
        lastSeen: new Date()
      });
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  }

  async sendPushNotification(userId, notification) {
    // Implement push notification logic here
    // You can use Firebase Cloud Messaging (FCM) or similar service
    console.log(`Sending push notification to user ${userId}:`, notification);
  }

  // Get online users
  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  // Send message to specific user
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Send message to conversation
  sendToConversation(conversationId, event, data) {
    this.io.to(`conversation_${conversationId}`).emit(event, data);
  }
}

module.exports = SocketService;