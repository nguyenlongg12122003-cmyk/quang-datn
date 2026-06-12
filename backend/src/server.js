require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server: SocketIOServer } = require('socket.io');
const { initDatabase } = require('./libs/initDb');
const { closePool, formatSqlError } = require('./libs/db');
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
const businessRoute = require('./routes/businessRoute');
const quotationRoute = require('./routes/quotationRoute');
const inventoryRoute = require('./routes/inventoryRoute');
const invoiceRoute = require('./routes/invoiceRoute');

const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();
const httpServer = http.createServer(app);
const USER_FRONTEND_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const ADMIN_FRONTEND_URL = process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174';
const allowedOrigins = [USER_FRONTEND_URL, ADMIN_FRONTEND_URL];
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
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
app.use('/api/business', businessRoute);
app.use('/api/quotations', quotationRoute);
app.use('/api/inventory', inventoryRoute);
app.use('/api/invoices', invoiceRoute);

app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 5000);

function listen(port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      httpServer.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      httpServer.off('error', onError);
      resolve();
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListening);
    httpServer.listen(port);
  });
}

async function bootstrap() {
  try {
    await initDatabase();
    await listen(PORT);
    console.log(`[server] Backend listening on port ${PORT}`);
    console.log(`[server] Socket.IO attached`);
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `[server] Port ${PORT} is already in use. Stop the other process or set PORT to a different value in .env.`,
      );
    } else {
      console.error(`[server] Failed to start:\n${formatSqlError(error)}`);
    }
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
