const { safeJsonParse } = require('../utils/mapRows');

/**
 * CANONICAL B2B / WHOLESALE PRICING MODEL (as of Phase 3 improvements)
 *
 * Precedence for unit price of a line (applied in resolvePackagingSelection + getUnitPriceForQty):
 * 1. Flash sale (if active) overrides everything for the base price.
 * 2. If packagingUnit selected:
 *    - If packagingUnits[].price is set (fixed pack price) → use that / qtyPerUnit.
 *    - Else fall back to tier logic below on totalQty.
 * 3. Tier / group pricing (customerType aware):
 *    - enterprise → groupPrices.enterprise (preferred for approved enterprise accounts)
 *    - wholesale  → groupPrices.wholesale
 *    - fallback  → product.wholesalePrice (legacy array of {minQty, price})
 *    - final fallback → product.price (retail)
 * 4. Quantity tiers: the lowest matching tier price (minQty <= effective qty) wins, but never higher than base.
 *
 * Important:
 * - customerType comes from users table (set on business approval).
 * - Cart shows prices at add time (may be retail snapshot).
 * - Báo giá creation ALWAYS re-prices server-side using current product + user's customerType.
 * - Admin edit of a quote can further override unitPrices per line (negotiation).
 *
 * Keep this in sync with:
 *   - frontend-user/src/lib/product.ts (client display helpers)
 *   - Admin product form (groupPrices + packagingUnits + wholesaleTiers)
 *
 * Future: Prefer groupPrices over legacy wholesalePrice. wholesalePrice kept for read compat.
 */

function isFlashSaleActive(product) {
  if (!product.isFlashSale || product.flashSalePrice == null) return false;
  if (!product.flashSaleEnd) return true;
  return new Date(product.flashSaleEnd).getTime() > Date.now();
}

function getEffectiveBasePrice(product) {
  if (isFlashSaleActive(product)) {
    return Number(product.flashSalePrice);
  }
  return Number(product.price || 0);
}

function getTierPrices(product, customerType = 'retail') {
  const groupPrices = safeJsonParse(product.groupPrices, {});
  const wholesaleTiers = safeJsonParse(product.wholesalePrice, []);

  if (customerType === 'enterprise' && Array.isArray(groupPrices.enterprise) && groupPrices.enterprise.length > 0) {
    return groupPrices.enterprise;
  }
  if (customerType === 'wholesale' && Array.isArray(groupPrices.wholesale) && groupPrices.wholesale.length > 0) {
    return groupPrices.wholesale;
  }
  if (Array.isArray(wholesaleTiers) && wholesaleTiers.length > 0) {
    return wholesaleTiers;
  }
  return [];
}

function getUnitPriceForQty(product, qty, customerType = 'retail') {
  const base = getEffectiveBasePrice(product);
  const tiers = getTierPrices(product, customerType)
    .filter((tier) => Number(qty) >= Number(tier.minQty))
    .map((tier) => Number(tier.price))
    .filter((price) => Number.isFinite(price));

  if (tiers.length === 0) return base;
  return Math.min(base, ...tiers);
}

function normalizePackagingUnits(raw) {
  const parsed = safeJsonParse(raw, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((unit) => {
      if (!unit || typeof unit !== 'object') return null;
      // Robust normalization: trim + collapse multiple spaces (common source of "invalid packaging" errors)
      const rawLabel = String(unit.label || unit.unit || '');
      const label = rawLabel.trim().replace(/\s+/g, ' ');
      const qtyPerUnit = Number(unit.qtyPerUnit || unit.quantity || 0);
      const price = unit.price != null ? Number(unit.price) : null;
      if (!label || !Number.isFinite(qtyPerUnit) || qtyPerUnit <= 0) return null;
      return {
        label,
        qtyPerUnit,
        price: Number.isFinite(price) ? price : null,
      };
    })
    .filter(Boolean);
}

function resolvePackagingSelection(product, packagingUnit, packagingQty, customerType = 'retail') {
  const units = normalizePackagingUnits(product.packagingUnits);
  const normalizedLabel = String(packagingUnit || '').trim();
  const normalizedPackQty = Math.max(1, Number(packagingQty || 1));

  if (!normalizedLabel) {
    const baseQty = normalizedPackQty;
    const unitPrice = getUnitPriceForQty(product, baseQty, customerType);
    return {
      packagingUnit: null,
      packagingQty: 1,
      quantity: baseQty,
      unitPrice,
    };
  }

  const normalizedLabelForMatch = normalizedLabel.replace(/\s+/g, ' ').toLowerCase();
  const selected = units.find((unit) => unit.label.toLowerCase() === normalizedLabelForMatch);
  if (!selected) {
    // Make error message actionable for the end user (cart items can become stale if packaging labels change)
    throw new Error(
      `Quy cách đóng gói không hợp lệ: ${normalizedLabel}. ` +
      `Vui lòng quay lại giỏ hàng, xóa sản phẩm này và thêm lại để cập nhật quy cách đóng gói hiện tại của sản phẩm.`
    );
  }

  const totalQty = selected.qtyPerUnit * normalizedPackQty;
  let unitPrice = selected.price != null
    ? Number(selected.price) / selected.qtyPerUnit
    : getUnitPriceForQty(product, totalQty, customerType);

  if (selected.price != null) {
    unitPrice = Number(selected.price) / selected.qtyPerUnit;
  }

  return {
    packagingUnit: selected.label,
    packagingQty: normalizedPackQty,
    quantity: totalQty,
    unitPrice,
  };
}

function calculateCustomizationExtra(product, customization) {
  if (!customization || !product.isCustomizable) return { extraPrice: 0, normalized: null };

  const options = safeJsonParse(product.customizationOptions, []);
  const type = String(customization.type || '').trim();
  const text = String(customization.text || '').trim();

  if (!type || !text) {
    throw new Error(`Thông tin tùy chỉnh không hợp lệ cho sản phẩm: ${product.name}`);
  }

  let selectedOption = null;
  if (Array.isArray(options) && options.length > 0) {
    selectedOption = options.find((opt) => {
      const label = typeof opt === 'string' ? opt : String(opt?.label || '');
      return label.toLowerCase() === type.toLowerCase();
    }) || null;

    if (!selectedOption) {
      throw new Error(`Loại tùy chỉnh không hợp lệ cho sản phẩm: ${product.name}`);
    }
  }

  const inputType = typeof selectedOption === 'object' && selectedOption?.inputType === 'image' ? 'image' : 'text';
  const extraPrice = typeof selectedOption === 'object' && Number.isFinite(Number(selectedOption?.extraPrice))
    ? Number(selectedOption.extraPrice)
    : 0;

  if (inputType === 'image') {
    const isDataUrl = text.startsWith('data:image/');
    const isUrl = text.startsWith('http://') || text.startsWith('https://');
    if (!isDataUrl && !isUrl) {
      throw new Error(`Ảnh tùy chỉnh không hợp lệ cho sản phẩm: ${product.name}`);
    }
  }

  return {
    extraPrice,
    normalized: {
      type,
      text,
      inputType,
      extraPrice,
    },
  };
}

function estimateDeliveryDate(items, productsById) {
  let maxLeadDays = 0;
  let hasCustom = false;

  for (const item of items) {
    const product = productsById[item.productId];
    if (!product) continue;
    if (item.customization) {
      hasCustom = true;
      maxLeadDays = Math.max(maxLeadDays, Number(product.customizationLeadDays || 3));
    }
  }

  const baseDays = hasCustom ? maxLeadDays + 2 : 2;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + baseDays);
  return date;
}

module.exports = {
  isFlashSaleActive,
  getEffectiveBasePrice,
  getTierPrices,
  getUnitPriceForQty,
  normalizePackagingUnits,
  resolvePackagingSelection,
  calculateCustomizationExtra,
  estimateDeliveryDate,
};