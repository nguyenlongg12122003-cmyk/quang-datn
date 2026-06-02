const { getPool, sql } = require('./db');
const jwt = require('jsonwebtoken');
const { CHAT_CHANNELS, isAdminRole, sendSupportChatMessage, validateMessageLength } = require('../services/chatService');

function attachSocketIO(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, role, email } = socket.user;

    void socket.join(`user:${userId}`);
    if (isAdminRole(role)) {
      void socket.join('admin');
    }

    console.log(`[socket] Connected: ${email} (${role}) — socket ${socket.id}`);

    socket.on('send_message', async (payload, callback) => {
      try {
        const { message, targetUserId, channel = CHAT_CHANNELS.SUPPORT } = payload || {};
        if (channel !== CHAT_CHANNELS.SUPPORT) {
          if (callback) callback({ error: 'Socket chat chỉ hỗ trợ kênh nhân viên' });
          return;
        }

        if (!message || !message.trim()) {
          if (callback) callback({ error: 'Message is required' });
          return;
        }

        const lengthError = validateMessageLength(message);
        if (lengthError) {
          if (callback) callback({ error: lengthError });
          return;
        }

        const isAdmin = isAdminRole(role);
        if (isAdmin && !targetUserId) {
          if (callback) callback({ error: 'targetUserId required for admin' });
          return;
        }

        const { chatMessage } = await sendSupportChatMessage({
          io,
          senderId: userId,
          senderEmail: email,
          senderRole: isAdmin ? 'admin' : 'customer',
          targetUserId,
          message,
        });

        if (callback) callback({ ok: true, id: chatMessage.id });
      } catch (err) {
        console.error('[socket] send_message error:', err);
        if (callback) callback({ error: 'Server error' });
      }
    });

    socket.on('mark_read', async (payload) => {
      try {
        const channel = payload?.channel || CHAT_CHANNELS.SUPPORT;
        if (channel !== CHAT_CHANNELS.SUPPORT) return;

        const pool = await getPool();
        if (isAdminRole(role) && payload?.userId) {
          await pool.request()
            .input('uid', sql.NVarChar, payload.userId)
            .query(`
              UPDATE dbo.chat_messages
              SET isRead = 1
              WHERE channel = 'support'
                AND senderId = @uid
                AND senderRole = 'customer'
            `);
          return;
        }

        await pool.request()
          .input('uid', sql.NVarChar, userId)
          .query(`
            UPDATE dbo.chat_messages
            SET isRead = 1
            WHERE channel = 'support'
              AND targetUserId = @uid
              AND senderRole = 'admin'
          `);
      } catch (err) {
        console.error('[socket] mark_read error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[socket] Disconnected: ${email}`);
    });
  });
}

module.exports = { attachSocketIO };
