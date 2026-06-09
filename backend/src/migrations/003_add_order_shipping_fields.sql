IF COL_LENGTH('dbo.orders', 'shippingCarrier') IS NULL
BEGIN
  ALTER TABLE dbo.orders ADD shippingCarrier NVARCHAR(50) NULL;
END;
GO

IF COL_LENGTH('dbo.orders', 'trackingNumber') IS NULL
BEGIN
  ALTER TABLE dbo.orders ADD trackingNumber NVARCHAR(100) NULL;
END;
GO

IF COL_LENGTH('dbo.orders', 'packingSlipPrintedAt') IS NULL
BEGIN
  ALTER TABLE dbo.orders ADD packingSlipPrintedAt DATETIME2 NULL;
END;
GO