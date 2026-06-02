-- Add voucher_usage table for audit trail
IF OBJECT_ID('dbo.voucher_usage', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.voucher_usage (
    id INT IDENTITY(1,1) PRIMARY KEY,
    voucherId NVARCHAR(50) NOT NULL,
    userId NVARCHAR(50) NOT NULL,
    orderId NVARCHAR(50) NOT NULL,
    discountAmount DECIMAL(18,2) NOT NULL,
    usedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (voucherId) REFERENCES dbo.vouchers(id),
    FOREIGN KEY (userId) REFERENCES dbo.users(id),
    FOREIGN KEY (orderId) REFERENCES dbo.orders(id)
  );

  -- Index for fast lookups
  CREATE INDEX IX_voucher_usage_voucherId ON dbo.voucher_usage(voucherId);
  CREATE INDEX IX_voucher_usage_userId ON dbo.voucher_usage(userId);
  CREATE INDEX IX_voucher_usage_orderId ON dbo.voucher_usage(orderId);

  PRINT 'Created voucher_usage table with indexes';
END
ELSE
BEGIN
  PRINT 'voucher_usage table already exists';
END;

-- Add computed column for case-insensitive unique constraint on voucher code
IF COL_LENGTH('dbo.vouchers', 'codeUpper') IS NULL
BEGIN
  ALTER TABLE dbo.vouchers ADD codeUpper AS UPPER(code) PERSISTED;

  -- Add unique constraint on uppercase code
  IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_vouchers_code_upper' AND object_id = OBJECT_ID('dbo.vouchers'))
  BEGIN
    ALTER TABLE dbo.vouchers ADD CONSTRAINT UQ_vouchers_code_upper UNIQUE (codeUpper);
    PRINT 'Added case-insensitive unique constraint on voucher code';
  END
END
ELSE
BEGIN
  PRINT 'codeUpper column already exists';
END;
