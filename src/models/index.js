const User = require('./User');
const Conversation = require('./Conversation');
const Message = require('./Message');

// Define associations
User.hasMany(Conversation, { 
  foreignKey: 'user1Id', 
  as: 'conversationsAsUser1' 
});

User.hasMany(Conversation, { 
  foreignKey: 'user2Id', 
  as: 'conversationsAsUser2' 
});

Conversation.belongsTo(User, { 
  foreignKey: 'user1Id', 
  as: 'user1' 
});

Conversation.belongsTo(User, { 
  foreignKey: 'user2Id', 
  as: 'user2' 
});

Conversation.hasMany(Message, { 
  foreignKey: 'conversationId', 
  as: 'messages' 
});

Conversation.belongsTo(Message, { 
  foreignKey: 'lastMessageId', 
  as: 'lastMessage' 
});

Message.belongsTo(Conversation, { 
  foreignKey: 'conversationId', 
  as: 'conversation' 
});

Message.belongsTo(User, { 
  foreignKey: 'senderId', 
  as: 'sender' 
});

Message.belongsTo(User, { 
  foreignKey: 'recipientId', 
  as: 'recipient' 
});

User.hasMany(Message, { 
  foreignKey: 'senderId', 
  as: 'sentMessages' 
});

User.hasMany(Message, { 
  foreignKey: 'recipientId', 
  as: 'receivedMessages' 
});

module.exports = {
  User,
  Conversation,
  Message
};