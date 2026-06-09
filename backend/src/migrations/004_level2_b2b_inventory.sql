-- Level 2: B2B, inventory, quotations, invoices, packaging

IF OBJECT_ID('dbo.users', 'U') IS NOT NULL AND COL_LENGTH('dbo.users', 'customerType') IS NULL
BEGIN
  ALTER TABLE dbo.users ADD customerType NVARCHAR(20) NOT NULL CONSTRAINT DF_users_customerType DEFAULT 'retail' WITH VALUES;
END;

IF OBJECT_ID('dbo.business_profiles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.business_profiles (
    userId NVARCHAR(50) PRIMARY KEY,
    companyName NVARCHAR(255) NOT NULL,
    taxCode NVARCHAR(50) NULL,
    businessType NVARCHAR(30) NOT NULL,
    contactPerson NVARCHAR(255) NOT NULL,
    contactPhone NVARCHAR(30) NULL,
    contactEmail NVARCHAR(255) NULL,
    invoiceAddress NVARCHAR(500) NULL,
    creditLimit DECIMAL(18,2) NOT NULL DEFAULT 0,
    paymentTermDays INT NOT NULL DEFAULT 0,
    [status] NVARCHAR(20) NOT NULL DEFAULT 'pending',
    approvedAt DATETIME2 NULL,
    approvedBy NVARCHAR(50) NULL,
    note NVARCHAR(1000) NULL,
    createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (userId) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.products', 'U') IS NOT NULL AND COL_LENGTH('dbo.products', 'barcode') IS NULL
BEGIN
  ALTER TABLE dbo.products ADD barcode NVARCHAR(100) NULL;
END;

IF OBJECT_ID('dbo.products', 'U') IS NOT NULL AND COL_LENGTH('dbo.products', 'lowStockThreshold') IS NULL
BEGIN
  ALTER TABLE dbo.products ADD lowStockThreshold INT NOT NULL CONSTRAINT DF_products_lowStockThreshold DEFAULT 10 WITH VALUES;
END;

IF OBJECT_ID('dbo.products', 'U') IS NOT NULL AND COL_LENGTH('dbo.products', 'packagingUnits') IS NULL
BEGIN
  ALTER TABLE dbo.products ADD packagingUnits NVARCHAR(MAX) NULL;
END;

IF OBJECT_ID('dbo.products', 'U') IS NOT NULL AND COL_LENGTH('dbo.products', 'groupPrices') IS NULL
BEGIN
  ALTER TABLE dbo.products ADD groupPrices NVARCHAR(MAX) NULL;
END;

IF OBJECT_ID('dbo.products', 'U') IS NOT NULL AND COL_LENGTH('dbo.products', 'customizationLeadDays') IS NULL
BEGIN
  ALTER TABLE dbo.products ADD customizationLeadDays INT NOT NULL CONSTRAINT DF_products_customizationLeadDays DEFAULT 3 WITH VALUES;
END;

IF OBJECT_ID('dbo.stock_movements', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.stock_movements (
    id NVARCHAR(50) PRIMARY KEY,
    productId NVARCHAR(50) NOT NULL,
    [type] NVARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    stockBefore INT NOT NULL,
    stockAfter INT NOT NULL,
    reason NVARCHAR(500) NULL,
    referenceType NVARCHAR(30) NULL,
    referenceId NVARCHAR(50) NULL,
    createdBy NVARCHAR(50) NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (productId) REFERENCES dbo.products(id)
  );
END;

IF OBJECT_ID('dbo.quotations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.quotations (
    id NVARCHAR(50) PRIMARY KEY,
    userId NVARCHAR(50) NOT NULL,
    code NVARCHAR(50) NOT NULL UNIQUE,
    [status] NVARCHAR(20) NOT NULL,
    subtotal DECIMAL(18,2) NOT NULL,
    discount DECIMAL(18,2) NOT NULL DEFAULT 0,
    total DECIMAL(18,2) NOT NULL,
    note NVARCHAR(MAX) NULL,
    validUntil DATETIME2 NOT NULL,
    convertedOrderId NVARCHAR(50) NULL,
    createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (userId) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.quotation_items', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.quotation_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    quotationId NVARCHAR(50) NOT NULL,
    productId NVARCHAR(50) NOT NULL,
    productName NVARCHAR(255) NOT NULL,
    productImage NVARCHAR(500) NULL,
    sku NVARCHAR(100) NULL,
    unitPrice DECIMAL(18,2) NOT NULL,
    quantity INT NOT NULL,
    packagingUnit NVARCHAR(50) NULL,
    packagingQty INT NOT NULL DEFAULT 1,
    customization NVARCHAR(MAX) NULL,
    FOREIGN KEY (quotationId) REFERENCES dbo.quotations(id)
  );
END;

IF OBJECT_ID('dbo.orders', 'U') IS NOT NULL AND COL_LENGTH('dbo.orders', 'paymentTermDays') IS NULL
BEGIN
  ALTER TABLE dbo.orders ADD paymentTermDays INT NULL;
END;

IF OBJECT_ID('dbo.orders', 'U') IS NOT NULL AND COL_LENGTH('dbo.orders', 'paymentDueDate') IS NULL
BEGIN
  ALTER TABLE dbo.orders ADD paymentDueDate DATETIME2 NULL;
END;

IF OBJECT_ID('dbo.orders', 'U') IS NOT NULL AND COL_LENGTH('dbo.orders', 'invoiceInfo') IS NULL
BEGIN
  ALTER TABLE dbo.orders ADD invoiceInfo NVARCHAR(MAX) NULL;
END;

IF OBJECT_ID('dbo.orders', 'U') IS NOT NULL AND COL_LENGTH('dbo.orders', 'quotationId') IS NULL
BEGIN
  ALTER TABLE dbo.orders ADD quotationId NVARCHAR(50) NULL;
END;

IF OBJECT_ID('dbo.orders', 'U') IS NOT NULL AND COL_LENGTH('dbo.orders', 'estimatedDeliveryDate') IS NULL
BEGIN
  ALTER TABLE dbo.orders ADD estimatedDeliveryDate DATETIME2 NULL;
END;

IF OBJECT_ID('dbo.orders', 'U') IS NOT NULL AND COL_LENGTH('dbo.orders', 'hasCustomItems') IS NULL
BEGIN
  ALTER TABLE dbo.orders ADD hasCustomItems BIT NOT NULL CONSTRAINT DF_orders_hasCustomItems DEFAULT 0 WITH VALUES;
END;

IF OBJECT_ID('dbo.order_items', 'U') IS NOT NULL AND COL_LENGTH('dbo.order_items', 'customizationStatus') IS NULL
BEGIN
  ALTER TABLE dbo.order_items ADD customizationStatus NVARCHAR(30) NULL;
END;

IF OBJECT_ID('dbo.order_items', 'U') IS NOT NULL AND COL_LENGTH('dbo.order_items', 'customizationNote') IS NULL
BEGIN
  ALTER TABLE dbo.order_items ADD customizationNote NVARCHAR(500) NULL;
END;

IF OBJECT_ID('dbo.order_items', 'U') IS NOT NULL AND COL_LENGTH('dbo.order_items', 'packagingUnit') IS NULL
BEGIN
  ALTER TABLE dbo.order_items ADD packagingUnit NVARCHAR(50) NULL;
END;

IF OBJECT_ID('dbo.order_items', 'U') IS NOT NULL AND COL_LENGTH('dbo.order_items', 'packagingQty') IS NULL
BEGIN
  ALTER TABLE dbo.order_items ADD packagingQty INT NOT NULL CONSTRAINT DF_order_items_packagingQty DEFAULT 1 WITH VALUES;
END;

IF OBJECT_ID('dbo.invoices', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.invoices (
    id NVARCHAR(50) PRIMARY KEY,
    orderId NVARCHAR(50) NOT NULL,
    invoiceNumber NVARCHAR(50) NOT NULL UNIQUE,
    taxCode NVARCHAR(50) NULL,
    companyName NVARCHAR(255) NULL,
    invoiceAddress NVARCHAR(500) NULL,
    subtotal DECIMAL(18,2) NOT NULL,
    vatRate DECIMAL(5,2) NOT NULL DEFAULT 10,
    vatAmount DECIMAL(18,2) NOT NULL,
    total DECIMAL(18,2) NOT NULL,
    [status] NVARCHAR(20) NOT NULL DEFAULT 'issued',
    issuedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    issuedBy NVARCHAR(50) NULL,
    FOREIGN KEY (orderId) REFERENCES dbo.orders(id)
  );
END;