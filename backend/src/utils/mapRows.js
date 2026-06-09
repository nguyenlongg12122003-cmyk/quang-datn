function safeJsonParse(value, fallback) {
  try {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapProductRow(row) {
  return {
    ...row,
    price: Number(row.price),
    originalPrice: Number(row.originalPrice),
    flashSalePrice: row.flashSalePrice !== null ? Number(row.flashSalePrice) : null,
    rating: Number(row.rating),
    stock: Number(row.stock ?? 0),
    sold: Number(row.sold ?? 0),
    lowStockThreshold: Number(row.lowStockThreshold ?? 10),
    customizationLeadDays: Number(row.customizationLeadDays ?? 3),
    images: safeJsonParse(row.images, []),
    specifications: safeJsonParse(row.specifications, {}),
    reviews: safeJsonParse(row.reviews, []),
    colors: safeJsonParse(row.colors, []),
    tags: safeJsonParse(row.tags, []),
    customizationOptions: safeJsonParse(row.customizationOptions, []),
    wholesalePrice: safeJsonParse(row.wholesalePrice, []),
    packagingUnits: safeJsonParse(row.packagingUnits, []),
    groupPrices: safeJsonParse(row.groupPrices, {}),
    isFlashSale: Boolean(row.isFlashSale),
    isCustomizable: Boolean(row.isCustomizable),
  };
}

module.exports = { safeJsonParse, mapProductRow };
