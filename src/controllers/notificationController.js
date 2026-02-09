const Notification = require('../models/Notification');
const User = require('../models/User');

// Get all notifications for current user
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    
    const notifications = await Notification.find({ recipient: userId })
      .populate({
        path: 'sender',
        select: 'firstName age photos profileImage'
      })
      .sort({ createdAt: -1 })
      .limit(50);

    // Format notifications for frontend
    const formattedNotifications = notifications.map(notif => ({
      id: notif._id,
      type: notif.type,
      message: notif.message,
      isRead: notif.isRead,
      createdAt: notif.createdAt,
      sender: {
        id: notif.sender._id,
        name: notif.sender.firstName,
        age: notif.sender.age,
        image: notif.sender.profileImage || (notif.sender.photos && notif.sender.photos.length > 0 ? notif.sender.photos[0].url : null)
      },
      metadata: notif.metadata
    }));

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    res.status(200).json({
      success: true,
      notifications: formattedNotifications,
      unreadCount
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: error.message
    });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.userId;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    res.status(200).json({
      success: true,
      unreadCount
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
};

// Create notification (helper function for internal use)
exports.createNotification = async (recipientId, senderId, type, message, metadata = {}) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      message,
      metadata
    });

    console.log('Notification created:', notification._id);
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};
