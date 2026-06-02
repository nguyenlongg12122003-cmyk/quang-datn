-- =============================================
-- Voucher Auto-Distribution System
-- Migration: 002_voucher_auto_distribution.sql
-- =============================================

-- 1. Voucher Templates (Mẫu voucher tự động)
IF OBJECT_ID('dbo.voucher_templates', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.voucher_templates (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    eventType NVARCHAR(50) NOT NULL, -- USER_REGISTERED, USER_BIRTHDAY, FIRST_ORDER, ORDER_MILESTONE, etc.
    [type] NVARCHAR(20) NOT NULL, -- percentage, fixed
    value DECIMAL(18,2) NOT NULL,
    minOrderValue DECIMAL(18,2) DEFAULT 0,
    maxDiscount DECIMAL(18,2),
    validDays INT NOT NULL DEFAULT 30, -- Số ngày có hiệu lực kể từ khi nhận
    [description] NVARCHAR(500),
    isActive BIT DEFAULT 1,
    createdAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    updatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
  );

  CREATE INDEX IX_voucher_templates_eventType ON dbo.voucher_templates(eventType);
  CREATE INDEX IX_voucher_templates_isActive ON dbo.voucher_templates(isActive);

  PRINT 'Created voucher_templates table';
END
ELSE
BEGIN
  PRINT 'voucher_templates table already exists';
END;

-- 2. User Vouchers (Voucher của user)
IF OBJECT_ID('dbo.user_vouchers', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.user_vouchers (
    id NVARCHAR(50) PRIMARY KEY,
    userId NVARCHAR(50) NOT NULL,
    voucherId NVARCHAR(50) NOT NULL,
    claimedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    expiresAt DATETIME2 NOT NULL,
    isUsed BIT DEFAULT 0,
    usedAt DATETIME2,
    orderId NVARCHAR(50),
    FOREIGN KEY (userId) REFERENCES dbo.users(id),
    FOREIGN KEY (voucherId) REFERENCES dbo.vouchers(id)
  );

  CREATE INDEX IX_user_vouchers_userId ON dbo.user_vouchers(userId);
  CREATE INDEX IX_user_vouchers_voucherId ON dbo.user_vouchers(voucherId);
  CREATE INDEX IX_user_vouchers_isUsed ON dbo.user_vouchers(isUsed);
  CREATE INDEX IX_user_vouchers_expiresAt ON dbo.user_vouchers(expiresAt);

  PRINT 'Created user_vouchers table';
END
ELSE
BEGIN
  PRINT 'user_vouchers table already exists';
END;

-- 3. Voucher Events (Log sự kiện phát voucher)
IF OBJECT_ID('dbo.voucher_events', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.voucher_events (
    id NVARCHAR(50) PRIMARY KEY,
    userId NVARCHAR(50) NOT NULL,
    eventType NVARCHAR(50) NOT NULL,
    voucherTemplateId NVARCHAR(50),
    voucherGenerated NVARCHAR(50), -- ID của voucher được tạo
    userVoucherId NVARCHAR(50), -- ID của user_voucher được tạo
    metadata NVARCHAR(MAX), -- JSON metadata
    createdAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (userId) REFERENCES dbo.users(id)
  );

  CREATE INDEX IX_voucher_events_userId ON dbo.voucher_events(userId);
  CREATE INDEX IX_voucher_events_eventType ON dbo.voucher_events(eventType);
  CREATE INDEX IX_voucher_events_createdAt ON dbo.voucher_events(createdAt);

  PRINT 'Created voucher_events table';
END
ELSE
BEGIN
  PRINT 'voucher_events table already exists';
END;

-- 4. Insert default voucher templates
IF NOT EXISTS (SELECT 1 FROM dbo.voucher_templates WHERE eventType = 'USER_REGISTERED')
BEGIN
  INSERT INTO dbo.voucher_templates (id, name, eventType, [type], value, minOrderValue, maxDiscount, validDays, [description], isActive)
  VALUES
    ('vt-welcome', N'Chào mừng thành viên mới', 'USER_REGISTERED', 'percentage', 10, 0, 50000, 30, N'Giảm 10% cho đơn hàng đầu tiên (tối đa 50k)', 1),
    ('vt-birthday', N'Sinh nhật vui vẻ', 'USER_BIRTHDAY', 'fixed', 50000, 200000, NULL, 7, N'Giảm 50k cho đơn hàng từ 200k trong tháng sinh nhật', 1),
    ('vt-first-order', N'Đơn hàng đầu tiên thành công', 'FIRST_ORDER_COMPLETED', 'percentage', 15, 0, 100000, 30, N'Giảm 15% cho đơn tiếp theo (tối đa 100k)', 1),
    ('vt-milestone-5', N'Khách hàng thân thiết', 'ORDER_MILESTONE_5', 'percentage', 20, 0, 150000, 60, N'Giảm 20% cho đơn thứ 5 (tối đa 150k)', 1),
    ('vt-milestone-10', N'Khách hàng VIP', 'ORDER_MILESTONE_10', 'fixed', 100000, 500000, NULL, 90, N'Giảm 100k cho đơn thứ 10 (đơn từ 500k)', 1),
    ('vt-comeback', N'Chào mừng trở lại', 'INACTIVE_USER_30', 'percentage', 25, 0, 200000, 15, N'Giảm 25% cho khách hàng quay lại sau 30 ngày (tối đa 200k)', 1);

  PRINT 'Inserted default voucher templates';
END;

PRINT 'Voucher auto-distribution schema created successfully!';
