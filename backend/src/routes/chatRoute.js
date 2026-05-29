const express = require('express');
const { getPool, sql } = require('../libs/db');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const { safeJsonParse } = require('../utils/mapRows');
const {
  CHAT_CHANNELS,
  isAdminRole,
  sendAiChatMessage,
  sendSupportChatMessage,
} = require('../services/chatService');

const router = express.Router();

function normalizeMessages(rows) {
  return rows.map((row) => ({
    ...row,
    metadata: safeJsonParse(row.metadata, null),
    isRead: Boolean(row.isRead),
  }));
}

function ensureCustomer(req, res) {
  if (isAdminRole(req.user.role)) {
    res.status(403).json({ message: 'Tính năng này chỉ dành cho khách hàng' });
    return false;
  }
  return true;
}

async function fetchConversationMessages({ userId, channel }) {
  const pool = await getPool();
  const result = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .input('channel', sql.NVarChar, channel)
    .query(`
      SELECT *
      FROM dbo.chat_messages
      WHERE channel = @channel
        AND (senderId = @userId OR targetUserId = @userId)
      ORDER BY [timestamp] ASC
    `);

  return normalizeMessages(result.recordset);
}

async function markCustomerMessagesRead({ userId, channel }) {
  const pool = await getPool();
  await pool.request()
    .input('userId', sql.NVarChar, userId)
    .input('channel', sql.NVarChar, channel)
    .query(`
      UPDATE dbo.chat_messages
      SET isRead = 1
      WHERE channel = @channel
        AND targetUserId = @userId
        AND senderRole = 'admin'
    `);
}

async function markSupportConversationReadForAdmin(userId) {
  const pool = await getPool();
  await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query(`
      UPDATE dbo.chat_messages
      SET isRead = 1
      WHERE channel = 'support'
        AND senderId = @userId
        AND senderRole = 'customer'
    `);
}

router.get('/support/conversations', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      WITH conversation_messages AS (
        SELECT
          CASE
            WHEN m.senderRole = 'customer' THEN m.senderId
            ELSE m.targetUserId
          END AS conversationUserId,
          m.senderRole,
          m.message,
          m.[timestamp],
          m.isRead
        FROM dbo.chat_messages m
        WHERE m.channel = 'support'
          AND (
            (m.senderRole = 'customer' AND m.senderId IS NOT NULL)
            OR (m.senderRole = 'admin' AND m.targetUserId IS NOT NULL)
          )
      )
      SELECT
        cm.conversationUserId AS userId,
        MAX(u.name) AS userName,
        MAX(u.avatar) AS userAvatar,
        MAX(cm.[timestamp]) AS lastMessageAt,
        (
          SELECT TOP 1 cm2.message
          FROM conversation_messages cm2
          WHERE cm2.conversationUserId = cm.conversationUserId
          ORDER BY cm2.[timestamp] DESC
        ) AS lastMessage,
        SUM(CASE WHEN cm.isRead = 0 AND cm.senderRole = 'customer' THEN 1 ELSE 0 END) AS unreadCount
      FROM conversation_messages cm
      LEFT JOIN dbo.users u ON u.id = cm.conversationUserId
      WHERE cm.conversationUserId IS NOT NULL
      GROUP BY cm.conversationUserId
      ORDER BY lastMessageAt DESC
    `);

    return res.json(result.recordset);
  } catch (error) {
    return next(error);
  }
});

router.get('/support/messages', authMiddleware, async (req, res, next) => {
  try {
    const isAdmin = isAdminRole(req.user.role);
    const userId = isAdmin ? req.query.userId : req.user.userId;

    if (isAdmin && !userId) {
      return res.status(400).json({ message: 'userId query param required for admin' });
    }

    const messages = await fetchConversationMessages({ userId, channel: CHAT_CHANNELS.SUPPORT });
    return res.json(messages);
  } catch (error) {
    return next(error);
  }
});

router.post('/support/messages', authMiddleware, async (req, res, next) => {
  try {
    const { message, targetUserId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const isAdmin = isAdminRole(req.user.role);
    if (isAdmin && !targetUserId) {
      return res.status(400).json({ message: 'targetUserId is required when admin sends a message' });
    }

    const io = req.app.get('io');
    const { chatMessage } = await sendSupportChatMessage({
      io,
      senderId: req.user.userId,
      senderEmail: req.user.email,
      senderRole: isAdmin ? 'admin' : 'customer',
      targetUserId,
      message,
    });

    return res.status(201).json({
      id: chatMessage.id,
      message: 'Message sent',
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/support/messages/read', authMiddleware, async (req, res, next) => {
  try {
    if (isAdminRole(req.user.role)) {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: 'userId required' });
      await markSupportConversationReadForAdmin(userId);
      return res.json({ message: 'Messages marked as read' });
    }

    await markCustomerMessagesRead({ userId: req.user.userId, channel: CHAT_CHANNELS.SUPPORT });
    return res.json({ message: 'Messages marked as read' });
  } catch (error) {
    return next(error);
  }
});

router.get('/ai/messages', authMiddleware, async (req, res, next) => {
  try {
    if (!ensureCustomer(req, res)) return;
    const messages = await fetchConversationMessages({ userId: req.user.userId, channel: CHAT_CHANNELS.AI });
    return res.json(messages);
  } catch (error) {
    return next(error);
  }
});

router.post('/ai/messages', authMiddleware, async (req, res, next) => {
  try {
    if (!ensureCustomer(req, res)) return;

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const io = req.app.get('io');
    const { chatMessage, aiMessage, aiReplyScheduled } = await sendAiChatMessage({
      io,
      senderId: req.user.userId,
      senderEmail: req.user.email,
      message,
    });

    return res.status(201).json({
      id: chatMessage.id,
      message: 'Message sent',
      aiMessage,
      aiReplyScheduled,
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/ai/messages/read', authMiddleware, async (req, res, next) => {
  try {
    if (!ensureCustomer(req, res)) return;
    await markCustomerMessagesRead({ userId: req.user.userId, channel: CHAT_CHANNELS.AI });
    return res.json({ message: 'Messages marked as read' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
