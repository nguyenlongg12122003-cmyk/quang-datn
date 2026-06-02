const { getPool, sql } = require('./db');
const { seedData } = require('../seed/mockSeed');

const createTablesSql = `
IF OBJECT_ID('dbo.brands', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.brands (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    logo NVARCHAR(500) NULL
  );
END;

IF OBJECT_ID('dbo.categories', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.categories (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    slug NVARCHAR(255) NOT NULL UNIQUE,
    icon NVARCHAR(20) NULL,
    description NVARCHAR(1000) NULL,
    productCount INT NOT NULL DEFAULT 0,
    image NVARCHAR(500) NULL
  );
END;

IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    id NVARCHAR(50) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    [name] NVARCHAR(255) NOT NULL,
    phone NVARCHAR(30) NULL,
    avatar NVARCHAR(500) NULL,
    [role] NVARCHAR(20) NOT NULL,
    [status] NVARCHAR(20) NOT NULL,
    passwordHash NVARCHAR(255) NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.addresses', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.addresses (
    id NVARCHAR(50) PRIMARY KEY,
    userId NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    phone NVARCHAR(30) NOT NULL,
    street NVARCHAR(500) NOT NULL,
    ward NVARCHAR(255) NULL,
    district NVARCHAR(255) NULL,
    city NVARCHAR(255) NOT NULL,
    isDefault BIT NOT NULL DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.products', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.products (
    id NVARCHAR(50) PRIMARY KEY,
    [name] NVARCHAR(255) NOT NULL,
    slug NVARCHAR(255) NOT NULL UNIQUE,
    sku NVARCHAR(100) NOT NULL UNIQUE,
    categoryId NVARCHAR(50) NOT NULL,
    brandId NVARCHAR(50) NOT NULL,
    price DECIMAL(18,2) NOT NULL,
    originalPrice DECIMAL(18,2) NOT NULL,
    discount INT NOT NULL DEFAULT 0,
    images NVARCHAR(MAX) NOT NULL,
    description NVARCHAR(MAX) NULL,
    specifications NVARCHAR(MAX) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    sold INT NOT NULL DEFAULT 0,
    rating DECIMAL(3,2) NOT NULL DEFAULT 0,
    reviewCount INT NOT NULL DEFAULT 0,
    reviews NVARCHAR(MAX) NOT NULL,
    colors NVARCHAR(MAX) NOT NULL,
    tags NVARCHAR(MAX) NOT NULL,
    isFlashSale BIT NOT NULL DEFAULT 0,
    flashSaleEnd DATETIME2 NULL,
    flashSalePrice DECIMAL(18,2) NULL,
    isCustomizable BIT NOT NULL DEFAULT 0,
    customizationOptions NVARCHAR(MAX) NULL,
    wholesalePrice NVARCHAR(MAX) NULL,
    createdAt DATETIME2 NOT NULL,
    [status] NVARCHAR(20) NOT NULL,
    FOREIGN KEY (categoryId) REFERENCES dbo.categories(id),
    FOREIGN KEY (brandId) REFERENCES dbo.brands(id)
  );
END;

IF OBJECT_ID('dbo.vouchers', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.vouchers (
    id NVARCHAR(50) PRIMARY KEY,
    code NVARCHAR(50) NOT NULL UNIQUE,
    [type] NVARCHAR(20) NOT NULL,
    value DECIMAL(18,2) NOT NULL,
    minOrderValue DECIMAL(18,2) NOT NULL,
    maxDiscount DECIMAL(18,2) NULL,
    usageLimit INT NOT NULL,
    usedCount INT NOT NULL,
    startDate DATETIME2 NOT NULL,
    endDate DATETIME2 NOT NULL,
    [status] NVARCHAR(20) NOT NULL,
    description NVARCHAR(1000) NULL
  );
END;

IF OBJECT_ID('dbo.orders', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.orders (
    id NVARCHAR(50) PRIMARY KEY,
    userId NVARCHAR(50) NOT NULL,
    subtotal DECIMAL(18,2) NOT NULL,
    shippingFee DECIMAL(18,2) NOT NULL,
    discount DECIMAL(18,2) NOT NULL,
    total DECIMAL(18,2) NOT NULL,
    [status] NVARCHAR(20) NOT NULL,
    paymentMethod NVARCHAR(30) NOT NULL,
    paymentStatus NVARCHAR(20) NOT NULL,
    shippingMethod NVARCHAR(20) NOT NULL,
    shippingAddress NVARCHAR(MAX) NOT NULL,
    voucherCode NVARCHAR(50) NULL,
    note NVARCHAR(MAX) NULL,
    createdAt DATETIME2 NOT NULL,
    returnRequest NVARCHAR(MAX) NULL,
    FOREIGN KEY (userId) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.order_items', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.order_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    orderId NVARCHAR(50) NOT NULL,
    productId NVARCHAR(50) NOT NULL,
    productName NVARCHAR(255) NOT NULL,
    productImage NVARCHAR(500) NULL,
    price DECIMAL(18,2) NOT NULL,
    quantity INT NOT NULL,
    customization NVARCHAR(MAX) NULL,
    FOREIGN KEY (orderId) REFERENCES dbo.orders(id)
  );
END;

IF OBJECT_ID('dbo.order_timeline', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.order_timeline (
    id INT IDENTITY(1,1) PRIMARY KEY,
    orderId NVARCHAR(50) NOT NULL,
    [status] NVARCHAR(20) NOT NULL,
    [date] DATETIME2 NOT NULL,
    note NVARCHAR(1000) NULL,
    FOREIGN KEY (orderId) REFERENCES dbo.orders(id)
  );
END;

IF OBJECT_ID('dbo.chat_messages', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.chat_messages (
    id NVARCHAR(50) PRIMARY KEY,
    channel NVARCHAR(20) NOT NULL DEFAULT 'support',
    senderId NVARCHAR(50) NOT NULL,
    senderName NVARCHAR(255) NOT NULL,
    senderRole NVARCHAR(20) NOT NULL,
    targetUserId NVARCHAR(50) NULL,
    message NVARCHAR(MAX) NOT NULL,
    metadata NVARCHAR(MAX) NULL,
    [timestamp] DATETIME2 NOT NULL,
    isRead BIT NOT NULL DEFAULT 0
  );
END
ELSE IF COL_LENGTH('dbo.chat_messages', 'targetUserId') IS NULL
BEGIN
  ALTER TABLE dbo.chat_messages ADD targetUserId NVARCHAR(50) NULL;
END;

IF OBJECT_ID('dbo.chat_messages', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.chat_messages', 'channel') IS NULL
BEGIN
  ALTER TABLE dbo.chat_messages
  ADD channel NVARCHAR(20) NOT NULL
    CONSTRAINT DF_chat_messages_channel DEFAULT 'support' WITH VALUES;
END;

IF OBJECT_ID('dbo.chat_messages', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.chat_messages', 'metadata') IS NULL
BEGIN
  ALTER TABLE dbo.chat_messages ADD metadata NVARCHAR(MAX) NULL;
END;

IF OBJECT_ID('dbo.reviews', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.reviews (
    id NVARCHAR(50) PRIMARY KEY,
    productId NVARCHAR(50) NOT NULL,
    userId NVARCHAR(50) NOT NULL,
    userName NVARCHAR(255) NOT NULL,
    userAvatar NVARCHAR(500) NULL,
    rating INT NOT NULL,
    comment NVARCHAR(MAX) NULL,
    helpful INT NOT NULL DEFAULT 0,
    isVerifiedPurchase BIT NOT NULL DEFAULT 0,
    createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (productId) REFERENCES dbo.products(id),
    FOREIGN KEY (userId) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.wishlist', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.wishlist (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId NVARCHAR(50) NOT NULL,
    productId NVARCHAR(50) NOT NULL,
    addedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (userId) REFERENCES dbo.users(id),
    FOREIGN KEY (productId) REFERENCES dbo.products(id),
    UNIQUE (userId, productId)
  );
END;
`;


async function initDatabase() {
  const pool = await getPool();
  await pool.request().query(createTablesSql);

  // Auto-run migrations
  console.log('[initDb] Checking for pending migrations...');
  const { runMigrations } = require('./migrationRunner');
  await runMigrations();

  const countResult = await pool.request().query('SELECT COUNT(1) AS total FROM dbo.products');
  const total = countResult.recordset[0]?.total || 0;
  if (total === 0) {
    await seedData(pool, sql);
    console.log('[db] Seeded initial data.');
  }
}

module.exports = { initDatabase };
