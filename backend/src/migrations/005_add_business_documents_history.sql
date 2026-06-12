-- 005: Add documents (for business license, authorization etc.) and reviewHistory to business_profiles for better B2B verification
-- Also adds optional support for tracking submission/review events immutably.

IF OBJECT_ID('dbo.business_profiles', 'U') IS NOT NULL
BEGIN
  -- Documents: JSON array of { type, url, name?, uploadedAt }
  IF COL_LENGTH('dbo.business_profiles', 'documents') IS NULL
  BEGIN
    ALTER TABLE dbo.business_profiles ADD documents NVARCHAR(MAX) NULL;
  END;

  -- Review history: JSON array of events for clear audit trail of submits, approvals, rejections
  -- Each event: { action, status, creditLimit?, paymentTermDays?, customerType?, note?, performedBy?, performedAt }
  IF COL_LENGTH('dbo.business_profiles', 'reviewHistory') IS NULL
  BEGIN
    ALTER TABLE dbo.business_profiles ADD reviewHistory NVARCHAR(MAX) NULL;
  END;
END;

-- Note: Existing profiles will have NULL for new columns (backward compatible).
-- The manage endpoint and forms will treat missing as [] .

-- Optional: If you want a dedicated history table instead of JSON for very high audit needs, 
-- a separate table business_profile_history can be added later with FK to business_profiles.userId.
-- For now, JSON follows the project's pattern for groupPrices, packagingUnits, images, customization etc.