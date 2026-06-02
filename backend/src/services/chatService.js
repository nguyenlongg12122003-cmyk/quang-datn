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

const MAX_MESSAGE_LENGTH = 2000;

function validateMessageLength(message) {
  if (String(message || '').length > MAX_MESSAGE_LENGTH) {
    return `Tin nhắn không được vượt quá ${MAX_MESSAGE_LENGTH} ký tự`;
  }
  return null;
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
  const id = createChatMessageId();
  const pool = await getPool();
  await pool.request()
    .input('id', sql.NVarChar, id)
    .input('channel', sql.NVarChar, channel)
    .input('senderId', sql.NVarChar, senderId)
    .input('senderName', sql.NVarChar, senderName)
    .input('senderRole', sql.NVarChar, senderRole)
    .input('targetUserId', sql.NVarChar, targetUserId)
    .input('message', sql.NVarChar(sql.MAX), String(message || '').trim())
    .input('metadata', sql.NVarChar(sql.MAX), metadata ? JSON.stringify(metadata) : null)
    .query(`
      INSERT INTO dbo.chat_messages (id, channel, senderId, senderName, senderRole, targetUserId, message, metadata, [timestamp], isRead)
      OUTPUT INSERTED.[timestamp]
      VALUES (@id, @channel, @senderId, @senderName, @senderRole, @targetUserId, @message, @metadata, SYSUTCDATETIME(), 0)
    `);

  const tsResult = await pool.request()
    .input('id', sql.NVarChar, id)
    .query('SELECT [timestamp] FROM dbo.chat_messages WHERE id = @id');

  const dbTimestamp = tsResult.recordset[0]?.timestamp;

  const payload = {
    id,
    channel,
    senderId,
    senderName,
    senderRole,
    targetUserId,
    message: String(message || '').trim(),
    metadata,
    timestamp: dbTimestamp ? new Date(dbTimestamp).toISOString() : new Date().toISOString(),
    isRead: false,
  };

  return payload;
}

function emitChatMessage(io, message) {
  if (!io) return;

  if (message.channel === CHAT_CHANNELS.AI) {
    if (message.senderRole === 'customer') {
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
    try {
      const fallbackMessage = await persistChatMessage({
        channel: CHAT_CHANNELS.AI,
        senderId: AI_SENDER_ID,
        senderName: getAiSenderName(),
        senderRole: 'admin',
        targetUserId: customerId,
        message: 'Xin lỗi bạn, mình đang gặp trục trặc kỹ thuật và chưa thể xử lý yêu cầu lúc này. Bạn vui lòng thử lại sau hoặc liên hệ nhân viên hỗ trợ nhé!',
        metadata: { isErrorFallback: true },
      });
      emitChatMessage(io, fallbackMessage);
    } catch (innerError) {
      console.error('[chat] AI fallback message also failed:', innerError.message);
    }
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
  MAX_MESSAGE_LENGTH,
  getAiSenderName,
  isAdminRole,
  validateMessageLength,
  sendAiChatMessage,
  sendSupportChatMessage,
};
