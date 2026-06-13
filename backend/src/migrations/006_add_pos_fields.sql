-- POS / in-store sales channel
IF OBJECT_ID('dbo.orders', 'U') IS NOT NULL AND COL_LENGTH('dbo.orders', 'salesChannel') IS NULL
BEGIN
  ALTER TABLE dbo.orders ADD salesChannel NVARCHAR(20) NOT NULL
    CONSTRAINT DF_orders_salesChannel DEFAULT 'online' WITH VALUES;
END;

IF OBJECT_ID('dbo.orders', 'U') IS NOT NULL AND COL_LENGTH('dbo.orders', 'createdByStaffId') IS NULL
BEGIN
  ALTER TABLE dbo.orders ADD createdByStaffId NVARCHAR(50) NULL;
END;

-- Walk-in customer account for POS orders (no login)
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = 'user-pos-walkin')
BEGIN
  INSERT INTO dbo.users (id, email, name, phone, avatar, [role], [status], customerType, passwordHash, createdAt)
  VALUES (
    'user-pos-walkin',
    'walkin@pos.internal',
    N'Khách lẻ tại quầy',
    NULL,
    NULL,
    'customer',
    'active',
    'retail',
    '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    SYSUTCDATETIME()
  );
END;