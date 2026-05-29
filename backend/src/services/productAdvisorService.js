const OpenAI = require('openai');
const { getPool, sql } = require('../libs/db');
const { mapProductRow } = require('../utils/mapRows');

const QUOTE_TAG_PREFIXES = ['[YEU_CAU_BAO_GIA_MUA_SI]', '[YEU_CAU_BAO_GIA_TUY_CHINH]'];

let openAIClient = null;

function isProductAdvisorEnabled() {
  return String(process.env.AI_CHAT_ENABLED || 'true') === 'true'
    && Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
}

function getProviderConfig() {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (openRouterApiKey) {
    return {
      apiKey: openRouterApiKey,
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
        'X-OpenRouter-Title': process.env.OPENROUTER_APP_NAME || 'QuangVPP AI Advisor',
      },
    };
  }

  return {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-5.4-mini',
    defaultHeaders: undefined,
  };
}

function getOpenAIClient() {
  if (!isProductAdvisorEnabled()) return null;

  if (!openAIClient) {
    const config = getProviderConfig();
    openAIClient = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      defaultHeaders: config.defaultHeaders,
    });
  }

  return openAIClient;
}

function shouldSkipAutoReply(message) {
  const trimmed = String(message || '').trim();
  if (!trimmed) return true;
  return QUOTE_TAG_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

function shouldGenerateProductAdvisorReply(message) {
  return isProductAdvisorEnabled() && !shouldSkipAutoReply(message);
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywords(message) {
  const stopWords = new Set([
    'toi', 'mình', 'minh', 'ban', 'bạn', 'shop', 'can', 'cần', 'muon', 'muốn', 'tim', 'tìm',
    'hoi', 'hỏi', 'tu', 'tư', 'van', 'vấn', 'giup', 'giúp', 'cho', 've', 'về', 'loai', 'loại',
    'nao', 'nào', 'cua', 'của', 'co', 'có', 'khong', 'không', 'gia', 'giá', 're', 'rẻ', 'tot',
    'tốt', 'de', 'để', 'la', 'là', 'mot', 'một', 'nhung', 'những', 'voi', 'với', 'hoc', 'học',
    'tap', 'tập', 'lam', 'làm', 'viec', 'việc', 'dung', 'dùng', 'duoc', 'được', 'hay', 'nen', 'nên',
  ]);

  const keywords = [];
  normalizeText(message)
    .split(' ')
    .filter(Boolean)
    .forEach((token) => {
      if (token.length < 2 || stopWords.has(token) || keywords.includes(token)) return;
      keywords.push(token);
    });

  return keywords.slice(0, 8);
}

function getDisplayPrice(product) {
  if (product.isFlashSale && Number(product.flashSalePrice) > 0) {
    return Number(product.flashSalePrice);
  }
  return Number(product.price || 0);
}

function summarizeRecommendationReason(product, message) {
  const normalizedMessage = normalizeText(message);
  const reasons = [];

  if (/\b(hoc sinh|cấp 2|cap 2|ghi chep|ghi chép|di hoc|đi học)\b/i.test(normalizedMessage)) {
    reasons.push('phù hợp cho ghi chép học tập hằng ngày');
  }
  if (/\b(van phong|văn phòng|cong viec|công việc|hop|họp)\b/i.test(normalizedMessage)) {
    reasons.push('hợp với môi trường làm việc văn phòng');
  }
  if (/\b(in|logo|tuy chinh|tùy chỉnh|qua tang|quà tặng)\b/i.test(normalizedMessage) && product.isCustomizable) {
    reasons.push('có hỗ trợ tùy chỉnh theo nhu cầu');
  }
  if (/\b(si|sỉ|so luong|số lượng|doanh nghiep|doanh nghiệp)\b/i.test(normalizedMessage) && Array.isArray(product.wholesalePrice) && product.wholesalePrice.length > 0) {
    reasons.push('có sẵn mốc giá sỉ');
  }
  if (product.rating >= 4.5) {
    reasons.push(`được đánh giá tốt ${Number(product.rating).toFixed(1)}/5`);
  }
  if (product.stock > 0) {
    reasons.push('đang còn hàng');
  }

  return reasons.slice(0, 2).join(', ') || 'phù hợp với nhu cầu bạn vừa mô tả';
}

function buildRecommendedProducts(products, message) {
  return products.slice(0, 3).map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: Array.isArray(product.images) ? (product.images[0]?.url || '') : '',
    price: getDisplayPrice(product),
    originalPrice: Number(product.originalPrice || product.price || 0),
    rating: Number(product.rating || 0),
    reviewCount: Number(product.reviewCount || 0),
    sold: Number(product.sold || 0),
    isFlashSale: Boolean(product.isFlashSale),
    isCustomizable: Boolean(product.isCustomizable),
    reason: summarizeRecommendationReason(product, message),
  }));
}

function hasMeaningfulProductSignals(message) {
  const keywords = extractKeywords(message);
  const normalizedMessage = normalizeText(message);
  const requiresWholesale = /\b(si|sỉ|so luong|số lượng|doanh nghiep|doanh nghiệp|van phong|văn phòng)\b/i.test(normalizedMessage);
  const requiresCustomization = /\b(in|logo|khac|khắc|tuy chinh|tùy chỉnh|qua tang|quà tặng)\b/i.test(normalizedMessage);
  const prefersSale = /\b(giam gia|giảm giá|sale|khuyen mai|khuyến mại|khuyến mãi)\b/i.test(normalizedMessage);
  const maxPrice = [
    normalizedMessage.match(/duoi\s+(\d+)\s*(k|nghin|ngàn|trieu|triệu)?/i),
    normalizedMessage.match(/toi da\s+(\d+)\s*(k|nghin|ngàn|trieu|triệu)?/i),
  ].filter(Boolean);

  return keywords.length > 0 || requiresWholesale || requiresCustomization || prefersSale || maxPrice.length > 0;
}

function formatWholesaleTiers(tiers) {
  if (!Array.isArray(tiers) || tiers.length === 0) return 'Khong co';
  return tiers
    .slice(0, 3)
    .map((tier) => `${Number(tier.minQty)}+: ${Number(tier.price)} VND`)
    .join('; ');
}

function formatSpecifications(specifications) {
  const entries = Object.entries(specifications || {}).slice(0, 4);
  if (entries.length === 0) return 'Khong co';
  return entries.map(([key, value]) => `${key}: ${value}`).join('; ');
}

function buildProductContext(products) {
  if (!products.length) {
    return 'Khong tim thay san pham phu hop trong catalog hien tai.';
  }

  return products.map((product, index) => {
    const image = Array.isArray(product.images) && product.images[0]?.url ? product.images[0].url : '';
    const previewDescription = String(product.description || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220);

    return [
      `San pham ${index + 1}:`,
      `- id: ${product.id}`,
      `- ten: ${product.name}`,
      `- slug: ${product.slug}`,
      `- gia_hien_tai: ${getDisplayPrice(product)} VND`,
      `- gia_niem_yet: ${Number(product.originalPrice || product.price || 0)} VND`,
      `- ton_kho: ${Number(product.stock || 0)}`,
      `- da_ban: ${Number(product.sold || 0)}`,
      `- danh_gia: ${Number(product.rating || 0)}/5 (${Number(product.reviewCount || 0)} reviews)`,
      `- danh_muc: ${product.categoryName || 'Khong ro'}`,
      `- thuong_hieu: ${product.brandName || 'Khong ro'}`,
      `- flash_sale: ${product.isFlashSale ? 'Co' : 'Khong'}`,
      `- tuy_chinh: ${product.isCustomizable ? 'Co' : 'Khong'}`,
      `- gia_si: ${formatWholesaleTiers(product.wholesalePrice)}`,
      `- mau_sac: ${(product.colors || []).slice(0, 5).join(', ') || 'Khong co'}`,
      `- tags: ${(product.tags || []).slice(0, 8).join(', ') || 'Khong co'}`,
      `- thong_so: ${formatSpecifications(product.specifications)}`,
      `- mo_ta: ${previewDescription || 'Khong co'}`,
      `- anh_dai_dien: ${image || 'Khong co'}`,
    ].join('\n');
  }).join('\n\n');
}

function buildConversationContext(messages) {
  if (!messages.length) return 'Khong co lich su tro chuyen truoc do.';

  return messages.map((item) => {
    const roleLabel = item.senderRole === 'customer' ? 'Khach hang' : item.senderName || 'Ho tro';
    const cleanMessage = String(item.message || '').replace(/\s+/g, ' ').trim();
    return `- ${roleLabel}: ${cleanMessage}`;
  }).join('\n');
}

async function fetchRecentConversation(customerId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('customerId', sql.NVarChar, customerId)
    .query(`
      SELECT TOP 6 senderRole, senderName, message, [timestamp]
      FROM dbo.chat_messages
      WHERE channel = 'ai' AND (senderId = @customerId OR targetUserId = @customerId)
      ORDER BY [timestamp] DESC
    `);

  return result.recordset.reverse();
}

async function fetchTopProducts(limit = 6) {
  const pool = await getPool();
  const result = await pool.request()
    .input('limit', sql.Int, limit)
    .query(`
      SELECT TOP (@limit)
        p.*,
        c.name AS categoryName,
        b.name AS brandName
      FROM dbo.products p
      LEFT JOIN dbo.categories c ON c.id = p.categoryId
      LEFT JOIN dbo.brands b ON b.id = p.brandId
      WHERE p.[status] = 'active'
      ORDER BY
        CASE WHEN p.stock > 0 THEN 0 ELSE 1 END,
        p.sold DESC,
        p.rating DESC,
        p.createdAt DESC
    `);

  return result.recordset.map(mapProductRow);
}

async function fetchRelevantProducts(message, limit = 6) {
  const keywords = extractKeywords(message);
  const normalizedMessage = normalizeText(message);
  const requiresWholesale = /\b(si|sỉ|so luong|số lượng|doanh nghiep|doanh nghiệp|van phong|văn phòng)\b/i.test(normalizedMessage);
  const requiresCustomization = /\b(in|logo|khac|khắc|tuy chinh|tùy chỉnh|qua tang|quà tặng)\b/i.test(normalizedMessage);
  const prefersSale = /\b(giam gia|giảm giá|sale|khuyen mai|khuyến mại|khuyến mãi)\b/i.test(normalizedMessage);
  const priceSignals = [
    normalizedMessage.match(/duoi\s+(\d+)\s*(k|nghin|ngàn|trieu|triệu)?/i),
    normalizedMessage.match(/toi da\s+(\d+)\s*(k|nghin|ngàn|trieu|triệu)?/i),
  ].filter(Boolean);
  const maxPrice = priceSignals.length > 0 ? toVnd(priceSignals[0][1], priceSignals[0][2]) : null;

  if (keywords.length === 0 && !requiresWholesale && !requiresCustomization && !prefersSale && !maxPrice) {
    return {
      products: await fetchTopProducts(limit),
      usedFallbackProducts: true,
      hasExactMatches: false,
    };
  }

  const pool = await getPool();
  const request = pool.request().input('limit', sql.Int, limit);
  const scoreParts = [];
  const whereConditions = ["p.[status] = 'active'"];

  keywords.forEach((keyword, index) => {
    const key = `term${index}`;
    request.input(key, sql.NVarChar, `%${keyword}%`);
    scoreParts.push(`
      CASE WHEN LOWER(p.name) LIKE @${key} THEN 10 ELSE 0 END
      + CASE WHEN LOWER(ISNULL(p.tags, '')) LIKE @${key} THEN 6 ELSE 0 END
      + CASE WHEN LOWER(ISNULL(p.description, '')) LIKE @${key} THEN 4 ELSE 0 END
      + CASE WHEN LOWER(ISNULL(p.specifications, '')) LIKE @${key} THEN 3 ELSE 0 END
      + CASE WHEN LOWER(ISNULL(c.name, '')) LIKE @${key} THEN 5 ELSE 0 END
      + CASE WHEN LOWER(ISNULL(b.name, '')) LIKE @${key} THEN 3 ELSE 0 END
    `);
  });

  if (requiresWholesale) {
    scoreParts.push("CASE WHEN p.wholesalePrice IS NOT NULL AND p.wholesalePrice <> '[]' THEN 8 ELSE 0 END");
  }
  if (requiresCustomization) {
    scoreParts.push('CASE WHEN p.isCustomizable = 1 THEN 8 ELSE 0 END');
  }
  if (prefersSale) {
    scoreParts.push('CASE WHEN p.isFlashSale = 1 OR p.discount > 0 THEN 6 ELSE 0 END');
  }
  if (maxPrice) {
    request.input('maxIntentPrice', sql.Decimal(18, 2), maxPrice);
    whereConditions.push('(COALESCE(NULLIF(p.flashSalePrice, 0), p.price) <= @maxIntentPrice)');
    scoreParts.push('CASE WHEN COALESCE(NULLIF(p.flashSalePrice, 0), p.price) <= @maxIntentPrice THEN 4 ELSE 0 END');
  }

  const scoreExpression = scoreParts.length > 0 ? scoreParts.join(' + ') : '0';
  const result = await request.query(`
    SELECT TOP (@limit)
      p.*,
      c.name AS categoryName,
      b.name AS brandName,
      (${scoreExpression}) AS matchScore
    FROM dbo.products p
    LEFT JOIN dbo.categories c ON c.id = p.categoryId
    LEFT JOIN dbo.brands b ON b.id = p.brandId
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY
      CASE WHEN p.stock > 0 THEN 0 ELSE 1 END,
      (${scoreExpression}) DESC,
      p.sold DESC,
      p.rating DESC,
      p.createdAt DESC
  `);

  const matchedProducts = result.recordset
    .filter((row) => Number(row.matchScore || 0) > 0)
    .map(mapProductRow);

  if (matchedProducts.length > 0) {
    return {
      products: matchedProducts,
      usedFallbackProducts: false,
      hasExactMatches: true,
    };
  }

  return {
    products: [],
    usedFallbackProducts: false,
    hasExactMatches: false,
  };
}

function toVnd(rawAmount, unit) {
  const amount = Number(rawAmount || 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const normalizedUnit = String(unit || '').toLowerCase();
  if (normalizedUnit === 'k' || normalizedUnit === 'nghin' || normalizedUnit === 'ngàn') {
    return amount * 1000;
  }
  if (normalizedUnit === 'trieu' || normalizedUnit === 'triệu') {
    return amount * 1000000;
  }
  return amount;
}

function buildPrompt(customerName, message, products, conversation) {
  return [
    `Ten khach hang: ${customerName || 'Khach hang'}`,
    `Tin nhan moi nhat cua khach: ${String(message || '').trim()}`,
    '',
    'Lich su tro chuyen gan day:',
    conversation,
    '',
    'Du lieu san pham lien quan trong catalog:',
    products,
  ].join('\n');
}

async function generateProductAdvisorReply({ customerId, customerName, message }) {
  if (!isProductAdvisorEnabled() || shouldSkipAutoReply(message)) {
    return null;
  }

  const client = getOpenAIClient();
  if (!client) return null;
  const providerConfig = getProviderConfig();

  const [productResult, recentConversation] = await Promise.all([
    fetchRelevantProducts(message),
    fetchRecentConversation(customerId),
  ]);
  const products = productResult.products;
  const recommendedProducts = productResult.hasExactMatches
    ? buildRecommendedProducts(products, message)
    : [];
  const productContext = products.length > 0 && (productResult.hasExactMatches || !hasMeaningfulProductSignals(message))
    ? buildProductContext(products)
    : buildProductContext([]);

  const completion = await client.chat.completions.create({
    model: providerConfig.model,
    messages: [
      {
        role: 'system',
        content: [
          'Bạn là AI tư vấn sản phẩm cho cửa hàng văn phòng phẩm QuangVPP.',
          'Chỉ được dựa trên dữ liệu catalog được cung cấp. Không được tự ý bổ sung thông tin không có trong context.',
          'Trả lời bằng tiếng Việt, ngắn gọn, tự nhiên, ưu tiên hữu ích và dễ mua hàng.',
          'Nếu câu hỏi mơ hồ, hãy hỏi tối đa 1 câu để làm rõ nhu cầu.',
          'Nếu có sản phẩm phù hợp, chỉ tóm tắt ngắn gọn định hướng lựa chọn và nói rằng các sản phẩm gợi ý đang hiển thị bên dưới.',
          'Nếu không tìm được sản phẩm phù hợp, nói rõ điều đó và đề xuất khách mô tả lại nhu cầu.',
          'Nếu câu hỏi liên quan đến đơn hàng, thanh toán, hoàn tiền hoặc khiếu nại, hãy xin phép chuyển cho nhân viên hỗ trợ.',
          'Không xưng hô máy móc. Hãy xưng là "mình" và gọi người dùng là "bạn".',
          'Không dùng markdown danh sách, không chèn link sản phẩm, không viết URL thô.',
        ].join(' '),
      },
      {
        role: 'user',
        content: buildPrompt(
          customerName,
          message,
          productContext,
          buildConversationContext(recentConversation),
        ),
      },
    ],
    max_tokens: 420,
  });

  const answer = String(completion.choices?.[0]?.message?.content || '').trim();
  if (!answer) return null;

  return {
    message: answer,
    recommendedProducts,
  };
}

module.exports = {
  generateProductAdvisorReply,
  isProductAdvisorEnabled,
  shouldGenerateProductAdvisorReply,
};
