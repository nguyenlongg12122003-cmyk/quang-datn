require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server: SocketIOServer } = require('socket.io');
const { initDatabase } = require('./libs/initDb');
const { closePool } = require('./libs/db');
const { attachSocketIO } = require('./libs/socketHandler');

const authRoute = require('./routes/authRoute');
const catalogRoute = require('./routes/catalogRoute');
const orderRoute = require('./routes/orderRoute');
const voucherRoute = require('./routes/voucherRoute');
const myVouchersRoute = require('./routes/myVouchersRoute');
const dashboardRoute = require('./routes/dashboardRoute');
const userRoute = require('./routes/userRoute');
const chatRoute = require('./routes/chatRoute');
const wishlistRoute = require('./routes/wishlistRoute');

const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();
const httpServer = http.createServer(app);
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const corsOptions = {
  origin: FRONTEND_BASE_URL,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: FRONTEND_BASE_URL,
    methods: ['GET', 'POST'],
  },
  connectionStateRecovery: {},
});
attachSocketIO(io);
app.set('io', io);

// ── Express Middleware ───────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '12mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend', timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoute);
app.use('/api/catalog', catalogRoute);
app.use('/api/orders', orderRoute);
app.use('/api/vouchers', voucherRoute);
app.use('/api/my-vouchers', myVouchersRoute);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/users', userRoute);
app.use('/api/chat', chatRoute);
app.use('/api/wishlist', wishlistRoute);

app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 5000);

async function bootstrap() {
  try {
    await initDatabase();
    httpServer.listen(PORT, () => {
      console.log(`[server] Backend listening on port ${PORT}`);
      console.log(`[server] Socket.IO attached`);
    });
  } catch (error) {
    console.error('[server] Failed to start:', error.message);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

bootstrap();
