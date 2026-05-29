const { getPool, sql } = require('../libs/db');
const { generateProductAdvisorReply, shouldGenerateProductAdvisorReply } = require('./productAdvisorService');

const AI_SENDER_ID = 'ai-product-advisor';
const CHAT_CHANNELS = {
  AI: 'ai',
  SUPPORT: 'support',
};

function isAdminRole(role) {
  return role === 'admin' || role === 'staff';
}

function getAiSenderName() {
  return process.env.AI_CHAT_ASSISTANT_NAME || 'AI tư vấn sản phẩm';
}

function createChatMessageId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function resolveSenderName({ userId, email }) {
  const pool = await getPool();
  const result = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query('SELECT TOP 1 name FROM dbo.users WHERE id = @userId');

  return result.recordset[0]?.name || email || 'Người dùng';
}

async function persistChatMessage({ channel, senderId, senderName, senderRole, targetUserId = null, message, metadata = null }) {
  const payload = {
    id: createChatMessageId(),
    channel,
    senderId,
    senderName,
    senderRole,
    targetUserId,
    message: String(message || '').trim(),
    metadata,
    timestamp: new Date().toISOString(),
    isRead: false,
  };

  const pool = await getPool();
  await pool.request()
    .input('id', sql.NVarChar, payload.id)
    .input('channel', sql.NVarChar, payload.channel)
    .input('senderId', sql.NVarChar, payload.senderId)
    .input('senderName', sql.NVarChar, payload.senderName)
    .input('senderRole', sql.NVarChar, payload.senderRole)
    .input('targetUserId', sql.NVarChar, payload.targetUserId)
    .input('message', sql.NVarChar(sql.MAX), payload.message)
    .input('metadata', sql.NVarChar(sql.MAX), payload.metadata ? JSON.stringify(payload.metadata) : null)
    .query(`
      INSERT INTO dbo.chat_messages (id, channel, senderId, senderName, senderRole, targetUserId, message, metadata, [timestamp], isRead)
      VALUES (@id, @channel, @senderId, @senderName, @senderRole, @targetUserId, @message, @metadata, SYSUTCDATETIME(), 0)
    `);

  return payload;
}

function emitChatMessage(io, message) {
  if (!io) return;

  if (message.channel === CHAT_CHANNELS.AI) {
    if (message.senderRole === 'customer') {
      io.to(`user:${message.senderId}`).emit('new_message', message);
      return;
    }

    if (message.targetUserId) {
      io.to(`user:${message.targetUserId}`).emit('new_message', message);
    }
    return;
  }

  if (message.senderRole === 'customer') {
    io.to('admin').emit('new_message', message);
    io.to(`user:${message.senderId}`).emit('new_message', message);
    return;
  }

  if (message.targetUserId) {
    io.to(`user:${message.targetUserId}`).emit('new_message', message);
  }
  io.to('admin').emit('new_message', message);
}

async function sendAiAdvisorReply({ io, customerId, customerName, customerMessage }) {
  try {
    const reply = await generateProductAdvisorReply({
      customerId,
      customerName,
      message: customerMessage,
    });

    if (!reply) return null;

    const aiMessage = await persistChatMessage({
      channel: CHAT_CHANNELS.AI,
      senderId: AI_SENDER_ID,
      senderName: getAiSenderName(),
      senderRole: 'admin',
      targetUserId: customerId,
      message: reply.message,
      metadata: {
        recommendedProducts: reply.recommendedProducts,
      },
    });

    emitChatMessage(io, aiMessage);
    return aiMessage;
  } catch (error) {
    console.error('[chat] AI advisor reply failed:', error.message);
    return null;
  }
}

async function sendSupportChatMessage({
  io,
  senderId,
  senderEmail,
  senderRole,
  targetUserId = null,
  message,
}) {
  const senderName = await resolveSenderName({ userId: senderId, email: senderEmail });
  const chatMessage = await persistChatMessage({
    channel: CHAT_CHANNELS.SUPPORT,
    senderId,
    senderName,
    senderRole,
    targetUserId: senderRole === 'customer' ? null : targetUserId,
    message,
  });

  emitChatMessage(io, chatMessage);
  return { chatMessage };
}

async function sendAiChatMessage({
  io,
  senderId,
  senderEmail,
  message,
}) {
  const senderName = await resolveSenderName({ userId: senderId, email: senderEmail });
  const chatMessage = await persistChatMessage({
    channel: CHAT_CHANNELS.AI,
    senderId,
    senderName,
    senderRole: 'customer',
    targetUserId: null,
    message,
  });

  emitChatMessage(io, chatMessage);

  const aiReplyScheduled = shouldGenerateProductAdvisorReply(message);
  if (aiReplyScheduled) {
    void sendAiAdvisorReply({
      io,
      customerId: senderId,
      customerName: senderName,
      customerMessage: chatMessage.message,
    });
  }

  return { chatMessage, aiMessage: null, aiReplyScheduled };
}

module.exports = {
  AI_SENDER_ID,
  CHAT_CHANNELS,
  getAiSenderName,
  isAdminRole,
  sendAiChatMessage,
  sendSupportChatMessage,
};
