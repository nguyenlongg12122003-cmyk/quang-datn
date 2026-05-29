# QuangVPP Backend API Docs for Frontend AI Agent

This document is written from the current backend implementation in `backend/src`.
It is intended to be accurate to the code, including current limitations and quirks.

Build the frontend against this document only. Do not invent missing endpoints.

## 1. Project Summary

- Backend stack: Express + SQL Server + Socket.IO
- Base HTTP URL in local dev: `http://localhost:5000/api`
- Base Socket.IO URL in local dev: `http://localhost:5000`
- Content type: JSON
- Request body size limit: `12mb`
- CORS origin: one frontend origin from `FRONTEND_BASE_URL` env
- Auth: JWT Bearer token

Typical frontend env:

```env
VITE_API_URL=http://localhost:5000/api
```

Socket client should connect to the API origin without `/api`.

## 2. Hard Rules for the Frontend Agent

1. Use `Authorization: Bearer <token>` on every protected route.
2. For public storefront product listing, explicitly request `status=active`.
3. Do not assume pagination exists. All list endpoints currently return full arrays.
4. Do not build UI for endpoints that do not exist, especially address editing.
5. Treat many mutation responses as minimal acknowledgements, not full updated resources.
6. For AI chat replies, do not expect the POST response to contain the assistant message immediately.
7. For admin features, note that most admin REST endpoints require `role === "admin"`, not `staff`.

## 3. Roles and Access Model

User roles stored in backend:

- `customer`
- `staff`
- `admin`

Important behavior:

- `adminMiddleware` only allows `role === "admin"`.
- `staff` is treated as admin-like only in support chat service/socket logic, not in most admin REST routes.
- Locked users are still able to log in with the current auth implementation. The frontend may show locked state, but backend does not block login yet.

## 4. Auth Model

JWT payload:

```json
{
  "userId": "user-123",
  "email": "user@example.com",
  "role": "customer"
}
```

Auth error responses:

- `401 { "message": "Missing token" }`
- `401 { "message": "Invalid or expired token" }`
- `403 { "message": "Admin access required" }`

## 5. Shared Data Models

These shapes reflect actual runtime payloads.

### 5.1 Address

```json
{
  "id": "addr-1",
  "name": "Nguyen Van A",
  "phone": "0912345678",
  "street": "123 Nguyen Hue",
  "ward": "Ben Nghe",
  "district": "Quan 1",
  "city": "TP. Ho Chi Minh",
  "isDefault": true
}
```

### 5.2 User

```json
{
  "id": "user-1",
  "email": "user@example.com",
  "name": "Nguyen Van A",
  "phone": "0912345678",
  "avatar": "https://...",
  "role": "customer",
  "status": "active",
  "createdAt": "2026-05-28T12:00:00.000Z",
  "addresses": []
}
```

### 5.3 ProductImage

```json
{
  "id": "prod-001-img-1",
  "url": "https://...",
  "alt": "Bút bi Thiên Long TL-027 0.5mm"
}
```

### 5.4 Product Customization Option

Backend accepts either simple strings or richer objects. Recommended format for frontend/admin:

```json
{
  "key": "logo-print",
  "label": "In logo",
  "inputType": "image",
  "placeholder": "Upload logo",
  "helpText": "PNG/JPG",
  "extraPrice": 5000
}
```

Order validation only relies on:

- `label`
- `inputType` (`text` or `image`)
- `extraPrice`

Simple string form also works:

```json
"In tên"
```

### 5.5 WholesalePrice

```json
{
  "minQty": 50,
  "price": 5400
}
```

### 5.6 Product

```json
{
  "id": "prod-001",
  "name": "Bút bi Thiên Long TL-027 0.5mm",
  "slug": "but-bi-thien-long-tl-027-0-5mm",
  "sku": "TL-TL027-05",
  "categoryId": "cat-pen",
  "brandId": "brand-thienlong",
  "price": 6000,
  "originalPrice": 7000,
  "discount": 14,
  "images": [
    {
      "id": "prod-001-img-1",
      "url": "https://...",
      "alt": "Bút bi Thiên Long TL-027 0.5mm"
    }
  ],
  "description": "Bút bi đầu 0.5mm...",
  "specifications": {
    "Loại bút": "Bút bi",
    "Đầu bi": "0.5mm"
  },
  "stock": 420,
  "sold": 980,
  "rating": 4.7,
  "reviewCount": 42,
  "reviews": [],
  "colors": ["Xanh", "Đỏ", "Đen"],
  "tags": ["bút bi", "thiên long", "văn phòng"],
  "isFlashSale": true,
  "flashSaleEnd": "2026-12-31T17:00:00.000Z",
  "flashSalePrice": 5000,
  "isCustomizable": true,
  "customizationOptions": ["In tên", "In logo công ty"],
  "wholesalePrice": [
    { "minQty": 50, "price": 5400 },
    { "minQty": 200, "price": 5000 }
  ],
  "createdAt": "2026-01-05T00:00:00.000Z",
  "status": "active"
}
```

### 5.7 Product Review

```json
{
  "id": "rev-1",
  "userId": "user-2",
  "userName": "Nguyen Van A",
  "userAvatar": "https://...",
  "rating": 5,
  "comment": "Sản phẩm tốt",
  "helpful": 0,
  "isVerifiedPurchase": true,
  "createdAt": "2026-05-28T12:00:00.000Z"
}
```

### 5.8 Voucher

```json
{
  "id": "v-1",
  "code": "WELCOME20K",
  "type": "fixed",
  "value": 20000,
  "minOrderValue": 150000,
  "maxDiscount": null,
  "usageLimit": 1000,
  "usedCount": 212,
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-12-31T23:59:59.000Z",
  "status": "active",
  "description": "Giảm 20.000đ cho đơn từ 150.000đ"
}
```

### 5.9 Order Item

```json
{
  "productId": "prod-001",
  "productName": "Bút bi Thiên Long TL-027 0.5mm",
  "productImage": "https://...",
  "price": 6000,
  "quantity": 20,
  "customization": {
    "type": "In tên",
    "text": "Nguyen Van A",
    "inputType": "text",
    "extraPrice": 0
  }
}
```

### 5.10 Order Timeline Entry

```json
{
  "status": "processing",
  "date": "2026-05-28T12:00:00.000Z",
  "note": "Đang chuẩn bị hàng"
}
```

### 5.11 Return Request

```json
{
  "reason": "Sản phẩm lỗi",
  "status": "pending",
  "createdAt": "2026-05-28T12:00:00.000Z",
  "resolvedAt": "2026-05-29T09:00:00.000Z",
  "note": "Đã duyệt"
}
```

### 5.12 Order

```json
{
  "id": "ORD-12345678",
  "userId": "user-2",
  "subtotal": 271000,
  "shippingFee": 30000,
  "discount": 20000,
  "total": 281000,
  "status": "delivered",
  "paymentMethod": "cod",
  "paymentStatus": "paid",
  "shippingMethod": "standard",
  "shippingAddress": {
    "name": "Nguyen Van A",
    "phone": "0912345678",
    "street": "45 Le Loi",
    "ward": "Phuong 2",
    "district": "Quan 3",
    "city": "TP. Ho Chi Minh"
  },
  "voucherCode": "WELCOME20K",
  "note": "Giao giờ hành chính",
  "createdAt": "2026-05-28T12:00:00.000Z",
  "returnRequest": null,
  "items": [],
  "timeline": []
}
```

Important: `order.shippingAddress` is stored as raw JSON from checkout payload. For newly created orders, it usually contains `name`, `phone`, `street`, `ward`, `district`, `city`, and may not contain `id` or `isDefault`.

Order status values:

- `pending`
- `confirmed`
- `processing`
- `shipping`
- `delivered`
- `cancelled`
- `returned`

Customer return request status values:

- `pending`
- `approved`
- `rejected`

Payment method values accepted by order creation:

- `cod`
- `vnpay`
- `payos`

Payment status values currently used by backend:

- `pending`
- `paid`
- `failed`
- `refunded`

### 5.13 Chat Message

```json
{
  "id": "msg-123",
  "channel": "ai",
  "senderId": "ai-product-advisor",
  "senderName": "AI tư vấn sản phẩm",
  "senderRole": "admin",
  "targetUserId": "user-2",
  "message": "Mình gợi ý một vài sản phẩm phù hợp...",
  "metadata": {
    "recommendedProducts": [
      {
        "id": "prod-001",
        "slug": "but-bi-thien-long-tl-027-0-5mm",
        "name": "Bút bi Thiên Long TL-027 0.5mm",
        "image": "https://...",
        "price": 5000,
        "originalPrice": 7000,
        "rating": 4.7,
        "reviewCount": 42,
        "sold": 980,
        "isFlashSale": true,
        "isCustomizable": true,
        "reason": "phù hợp cho ghi chép học tập hằng ngày"
      }
    ]
  },
  "timestamp": "2026-05-28T12:00:00.000Z",
  "isRead": false
}
```

Chat channels:

- `support`
- `ai`

Sender roles seen in chat payload:

- `customer`
- `admin`

Note: AI messages are stored with `senderRole: "admin"`.

## 6. Common HTTP Behavior

### 6.1 Success response style

Read endpoints usually return full JSON arrays/objects.
Mutation endpoints often return one of:

```json
{ "id": "..." }
```

```json
{ "message": "..." }
```

```json
{ "ok": true }
```

### 6.2 Error response style

Application errors usually return:

```json
{ "message": "..." }
```

Unexpected server errors:

```json
{
  "message": "Internal server error",
  "detail": "Only present in development"
}
```

### 6.3 Not found

Unknown route:

```json
{ "message": "Not found" }
```

## 7. Endpoint Reference

## 7.1 Health

### `GET /api/health`

Public.

Response:

```json
{
  "status": "ok",
  "service": "backend",
  "timestamp": "2026-05-28T12:00:00.000Z"
}
```

## 7.2 Auth

### `POST /api/auth/login`

Public.

Request:

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

Success response:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-2",
    "email": "user@example.com",
    "name": "Nguyen Van A",
    "phone": "0912345678",
    "avatar": "https://...",
    "role": "customer",
    "status": "active",
    "createdAt": "2026-05-28T12:00:00.000Z",
    "addresses": []
  }
}
```

Errors:

- `400` if email/password missing
- `401` if invalid credentials

### `POST /api/auth/register`

Public.

Request:

```json
{
  "name": "Nguyen Van A",
  "email": "user@example.com",
  "password": "123456",
  "phone": "0912345678"
}
```

Success: `201`

```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-1716900000000",
    "email": "user@example.com",
    "name": "Nguyen Van A",
    "phone": "0912345678",
    "avatar": "https://api.dicebear.com/...",
    "role": "customer",
    "status": "active",
    "addresses": [],
    "createdAt": "2026-05-28T12:00:00.000Z"
  }
}
```

Errors:

- `400` missing required fields
- `409` email already exists

### `GET /api/auth/me`

Protected.

Returns current authenticated user plus addresses.

Errors:

- `404` user not found

## 7.3 Catalog

### Categories

### `GET /api/catalog/categories`

Public.

Response: array of categories.

Each category:

```json
{
  "id": "cat-pen",
  "name": "Bút viết",
  "slug": "but-viet",
  "icon": "PenTool",
  "description": "Bút bi, bút gel...",
  "image": "https://...",
  "productCount": 5
}
```

### `POST /api/catalog/categories`

Protected admin only.

Request:

```json
{
  "name": "Bút viết",
  "slug": "but-viet",
  "icon": "PenTool",
  "description": "Mô tả"
}
```

Success:

```json
{ "id": "cat-1716900000000" }
```

Important: current backend does not accept/write category `image` in create/update routes even though GET returns `image`.

### `PUT /api/catalog/categories/:id`

Protected admin only.

Request fields: same as create.

Response:

```json
{ "ok": true }
```

### `DELETE /api/catalog/categories/:id`

Protected admin only.

Response:

```json
{ "ok": true }
```

### Brands

### `GET /api/catalog/brands`

Public.

Response:

```json
[
  {
    "id": "brand-thienlong",
    "name": "Thiên Long",
    "logo": null
  }
]
```

### `POST /api/catalog/brands`

Protected admin only.

Request:

```json
{
  "name": "Thiên Long",
  "logo": "https://..."
}
```

Response:

```json
{ "id": "brand-1716900000000" }
```

### `PUT /api/catalog/brands/:id`

Protected admin only.

Response:

```json
{ "ok": true }
```

### `DELETE /api/catalog/brands/:id`

Protected admin only.

Response:

```json
{ "ok": true }
```

### Products

### `GET /api/catalog/products`

Public.

Query params supported:

- `categoryId`
- `categorySlug`
- `brandId`
- `q`
- `sortBy` = `popular` | `price-asc` | `price-desc` | `newest` | `rating`
- `isFlashSale=true`
- `isCustomizable=true`
- `hasWholesale=true`
- `status`
- `minPrice`
- `maxPrice`
- `limit`

Important:

- Default sort is `sold DESC`
- No default `status=active` filter
- Public storefront should call with `status=active`

Example:

`GET /api/catalog/products?status=active&categorySlug=but-viet&sortBy=rating&isFlashSale=true`

Response: array of product objects.

### `GET /api/catalog/products/:idOrSlug`

Public.

Looks up by exact `id` or exact `slug`.

Errors:

- `404 { "message": "Product not found" }`

### `GET /api/catalog/search-suggestions?q=...`

Public.

Response:

```json
["Bút bi Thiên Long TL-027 0.5mm", "Bút gel Pentel EnerGel BLN105 0.5mm"]
```

Important: this route does not filter inactive products.

### `POST /api/catalog/products`

Protected admin only.

Recommended request shape:

```json
{
  "name": "Bút bi Thiên Long TL-027 0.5mm",
  "slug": "but-bi-thien-long-tl-027-0-5mm",
  "sku": "TL-TL027-05",
  "categoryId": "cat-pen",
  "brandId": "brand-thienlong",
  "price": 6000,
  "originalPrice": 7000,
  "discount": 14,
  "images": [
    { "id": "img-1", "url": "https://...", "alt": "Bút bi" }
  ],
  "description": "Mô tả",
  "specifications": { "Loại bút": "Bút bi" },
  "stock": 420,
  "colors": ["Xanh", "Đỏ"],
  "tags": ["bút bi", "thiên long"],
  "isFlashSale": true,
  "flashSaleEnd": "2026-12-31T17:00:00.000Z",
  "flashSalePrice": 5000,
  "isCustomizable": true,
  "customizationOptions": [
    {
      "key": "logo-print",
      "label": "In logo",
      "inputType": "image",
      "placeholder": "Upload logo",
      "helpText": "PNG/JPG",
      "extraPrice": 5000
    }
  ],
  "wholesalePrice": [
    { "minQty": 50, "price": 5400 }
  ],
  "status": "active"
}
```

Required by backend:

- `name`
- `sku`
- `categoryId`
- `brandId`
- `price`
- `originalPrice`

Success: `201`

```json
{ "id": "prod-1716900000000", "message": "Product created" }
```

### `PUT /api/catalog/products/:id`

Protected admin only.

Partial update supported.

Response:

```json
{ "message": "Product updated" }
```

### `DELETE /api/catalog/products/:id`

Protected admin only.

Response:

```json
{ "message": "Product deleted" }
```

### `PATCH /api/catalog/products/:id/stock`

Protected admin only.

Request:

```json
{ "stock": 150 }
```

Response:

```json
{ "message": "Stock updated" }
```

Errors:

- `400` if stock missing or negative

### Reviews

### `GET /api/catalog/products/:id/reviews`

Public.

Returns source-of-truth review list.

Important: use this endpoint for review history. The `reviews` array inside product payload may become stale after new reviews are submitted.

### `POST /api/catalog/products/:id/reviews`

Protected.

Request:

```json
{
  "rating": 5,
  "comment": "Sản phẩm tốt"
}
```

Success: `201`

```json
{
  "id": "rev-1716900000000",
  "isVerifiedPurchase": true,
  "message": "Review submitted"
}
```

Errors:

- `400` rating out of range
- `409` duplicate review by same user for same product

Verified purchase logic:

- `true` only if the user has a delivered order containing the product

## 7.4 Wishlist

All wishlist routes are protected.

### `GET /api/wishlist`

Returns full product objects, plus `addedAt`.

### `POST /api/wishlist`

Request:

```json
{ "productId": "prod-001" }
```

Responses:

- `201 { "message": "Added to wishlist" }`
- `200 { "message": "Already in wishlist" }`
- `404 { "message": "Product not found" }`

### `DELETE /api/wishlist/:productId`

Response:

```json
{ "message": "Removed from wishlist" }
```

## 7.5 Vouchers

### `GET /api/vouchers`

Public.

Returns all vouchers sorted by `startDate DESC`.

Important: comment in backend says "list active vouchers", but actual route returns all vouchers. Frontend should filter active vouchers client-side if needed.

### `POST /api/vouchers/validate`

Public.

Request:

```json
{
  "code": "WELCOME20K",
  "subtotal": 250000
}
```

Success:

```json
{
  "valid": true,
  "voucher": {
    "id": "v-1",
    "code": "WELCOME20K",
    "type": "fixed",
    "value": 20000,
    "minOrderValue": 150000,
    "maxDiscount": null,
    "usageLimit": 1000,
    "usedCount": 212,
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-12-31T23:59:59.000Z",
    "status": "active",
    "description": "Giảm 20.000đ cho đơn từ 150.000đ"
  },
  "discount": 20000
}
```

Failure examples:

- `404 { "valid": false, "message": "Voucher không tồn tại" }`
- `400 { "valid": false, "message": "Voucher không còn hiệu lực" }`
- `400 { "valid": false, "message": "Đơn hàng tối thiểu 150000" }`
- `400 { "valid": false, "message": "Voucher đã hết lượt sử dụng" }`

### `POST /api/vouchers`

Protected admin only.

Request:

```json
{
  "code": "WELCOME20K",
  "type": "fixed",
  "value": 20000,
  "minOrderValue": 150000,
  "maxDiscount": null,
  "usageLimit": 1000,
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-12-31T23:59:59.000Z",
  "description": "Giảm 20.000đ cho đơn từ 150.000đ"
}
```

Success: `201`

```json
{ "id": "v-1716900000000", "message": "Voucher created" }
```

### `PUT /api/vouchers/:id`

Protected admin only.

Partial update supported.

Response:

```json
{ "message": "Voucher updated" }
```

### `DELETE /api/vouchers/:id`

Protected admin only.

Response:

```json
{ "message": "Voucher deleted" }
```

## 7.6 Orders and Payments

## 7.6.1 Customer Order Routes

### `GET /api/orders/my-orders`

Protected.

Returns current user orders with:

- parsed `shippingAddress`
- parsed `returnRequest`
- `items`
- `timeline`

### `POST /api/orders`

Protected.

Creates a new order.

Request shape used by current frontend:

```json
{
  "items": [
    {
      "productId": "prod-001",
      "productName": "Bút bi Thiên Long TL-027 0.5mm",
      "productImage": "https://...",
      "quantity": 20,
      "price": 6000,
      "customization": {
        "type": "In tên",
        "text": "Nguyen Van A",
        "inputType": "text",
        "extraPrice": 0
      }
    }
  ],
  "shippingAddress": {
    "name": "Nguyen Van A",
    "phone": "0912345678",
    "street": "45 Le Loi",
    "ward": "Phuong 2",
    "district": "Quan 3",
    "city": "TP. Ho Chi Minh"
  },
  "paymentMethod": "cod",
  "shippingMethod": "standard",
  "voucherCode": "WELCOME20K",
  "note": "Giao giờ hành chính",
  "subtotal": 120000,
  "shippingFee": 30000,
  "discount": 20000,
  "total": 130000
}
```

Actual backend behavior:

- `items` is required and must be non-empty
- `paymentMethod` allowed: `cod`, `vnpay`, `payos`
- backend recomputes subtotal and total from product data
- frontend `subtotal` and `total` are not authoritative
- backend stores `shippingAddress` as JSON
- backend does not strictly validate `shippingMethod`; current frontend convention is `standard`, `express`, `same_day`
- backend validates customization if provided
- if customization option uses `inputType: "image"`, `text` must be a `data:image/...` URL

Customization validation rules:

- product must be customizable
- `type` is required
- `text` is required
- if product has predefined customization options, `type` must match an option label
- `inputType=image` requires `text` to start with `data:image/`

COD success response:

```json
{
  "id": "ORD-12345678",
  "message": "Order created successfully"
}
```

VNPay success response:

```json
{
  "id": "ORD-12345678",
  "paymentMethod": "vnpay",
  "paymentStatus": "pending",
  "paymentUrl": "https://sandbox.vnpayment.vn/..."
}
```

PayOS success response:

```json
{
  "id": "ORD-12345678",
  "paymentMethod": "payos",
  "paymentStatus": "pending",
  "paymentUrl": "https://pay.payos.vn/..."
}
```

Common create-order errors:

- `400` invalid payment method
- `400` items missing
- `400` invalid customization
- `500` payment gateway not configured

Important implementation notes:

- Current backend does not validate stock before order creation.
- Current backend does not validate voucher correctness during order creation. Frontend should validate voucher before submit.
- Current backend computes minimum unit price from base `product.price`, not `flashSalePrice`. Do not assume flash-sale price will be preserved server-side in checkout.

### `POST /api/orders/:id/cancel`

Protected.

Customer can cancel only own `pending` orders.

Response:

```json
{ "message": "Order cancelled" }
```

Errors:

- `404` order not found
- `400` if order is not `pending`

### `POST /api/orders/:id/return-request`

Protected.

Request:

```json
{ "reason": "Sản phẩm lỗi" }
```

Rules:

- order must belong to current user
- order status must be `delivered`
- only one return request allowed

Success: `201`

```json
{
  "message": "Return request submitted",
  "returnRequest": {
    "reason": "Sản phẩm lỗi",
    "status": "pending",
    "createdAt": "2026-05-28T12:00:00.000Z"
  }
}
```

## 7.6.2 Payment Verification Routes

### `GET /api/orders/vnpay-return`

Public gateway return route.

Backend verifies VNPay response, updates order, then redirects browser to frontend `/orders` with query params:

- success: `?payment=vnpay_success&orderId=...`
- failure: `?payment=vnpay_failed&orderId=...&reason=...&code=...`

This is mainly for browser redirect, not for API UI rendering.

### `GET /api/orders/vnpay-verify`

Public.

Frontend should call this on a dedicated VNPay return page using the raw VNPay query params.

Success:

```json
{
  "success": true,
  "orderId": "ORD-12345678",
  "code": "00"
}
```

Failure:

```json
{
  "success": false,
  "orderId": "ORD-12345678",
  "reason": "payment_failed",
  "code": "24",
  "message": "..."
}
```

### `GET /api/orders/payos-verify`

Public.

Frontend should call this on the frontend page configured as `PAYOS_RETURN_URL`, usually `/payment/payos-return`.

Query params should include PayOS return params, especially:

- `orderCode`
- `paymentLinkId` if present

Success:

```json
{
  "success": true,
  "orderId": "ORD-12345678",
  "orderCode": 12345678,
  "paymentStatus": "PAID"
}
```

Pending:

```json
{
  "success": false,
  "pending": true,
  "orderId": "ORD-12345678",
  "orderCode": 12345678,
  "paymentStatus": "PENDING",
  "reason": "payment_pending"
}
```

Failure:

```json
{
  "success": false,
  "orderId": "ORD-12345678",
  "orderCode": 12345678,
  "paymentStatus": "CANCELLED",
  "reason": "payment_failed"
}
```

### `POST /api/orders/payos-webhook`

Public server-to-server webhook endpoint.

Frontend does not call this directly.

## 7.6.3 Admin Order Routes

All routes below require admin.

### `GET /api/orders`

Query params:

- `status`
- `q`

Behavior:

- `status=all` or omitted means no status filter
- `q` matches order `id` or raw `shippingAddress` JSON string

Response: array of fully built orders.

### `PATCH /api/orders/:id/status`

Admin only.

Request:

```json
{
  "status": "processing",
  "note": "Đang đóng gói"
}
```

Valid statuses:

- `pending`
- `confirmed`
- `processing`
- `shipping`
- `delivered`
- `cancelled`
- `returned`

Allowed transitions:

- `pending -> confirmed | cancelled`
- `confirmed -> processing | cancelled`
- `processing -> shipping | cancelled`
- `shipping -> delivered`
- `delivered -> none`
- `cancelled -> none`
- `returned -> none`

Success:

```json
{
  "message": "Order status updated",
  "paymentStatus": "paid"
}
```

Special behavior:

- cancelling a paid order sets `paymentStatus` to `refunded`
- cancelling an order with voucher decrements voucher usage count
- cancelling a PayOS order also tries to cancel the PayOS payment link

### `PATCH /api/orders/:id/return`

Admin only.

Request:

```json
{
  "action": "approved",
  "note": "Đã duyệt hoàn hàng"
}
```

`action` must be:

- `approved`
- `rejected`

Behavior:

- approved => order status becomes `returned`, payment status becomes `refunded`
- rejected => order status goes back to `delivered`

Success:

```json
{ "message": "Return request approved" }
```

## 7.7 Users

## 7.7.1 Customer Profile Routes

### `PUT /api/users/me`

Protected.

Request:

```json
{
  "name": "Nguyen Van A",
  "phone": "0912345678",
  "avatar": "https://..."
}
```

Response:

```json
{ "message": "Profile updated" }
```

Important: backend does not return the updated user object.

### `POST /api/users/change-password`

Protected.

Request:

```json
{
  "oldPassword": "123456",
  "newPassword": "654321"
}
```

Response:

```json
{ "message": "Password updated" }
```

Errors:

- `400` old/new password missing
- `400` old password incorrect
- `404` user not found

## 7.7.2 Addresses

There is no dedicated GET addresses route.
Addresses are returned inside auth payloads (`/auth/login`, `/auth/register`, `/auth/me`).

There is also no address update endpoint.

### `POST /api/users/addresses`

Protected.

Request:

```json
{
  "name": "Nguyen Van A",
  "phone": "0912345678",
  "street": "45 Le Loi",
  "ward": "Phuong 2",
  "district": "Quan 3",
  "city": "TP. Ho Chi Minh",
  "isDefault": true
}
```

Response: `201`

```json
{ "id": "addr-1716900000000", "message": "Address added" }
```

If `isDefault=true`, backend clears previous default addresses first.

### `DELETE /api/users/addresses/:id`

Protected.

Response:

```json
{ "message": "Address deleted" }
```

### `PATCH /api/users/addresses/:id/default`

Protected.

Response:

```json
{ "message": "Default address updated" }
```

## 7.7.3 Admin User Management

All routes below require admin.

### `GET /api/users`

Query params:

- `q`
- `role`

Response: array of users without password hashes.

### `PATCH /api/users/:id/status`

Request:

```json
{ "status": "locked" }
```

Allowed values:

- `active`
- `locked`

Response:

```json
{ "message": "User locked" }
```

### `PATCH /api/users/:id/role`

Request:

```json
{ "role": "staff" }
```

Allowed values:

- `admin`
- `staff`
- `customer`

Response:

```json
{ "message": "User role updated" }
```

## 7.8 Dashboard and Reports

All routes require admin.

### `GET /api/dashboard/stats`

Returns:

```json
{
  "totalRevenue": 123456789,
  "totalOrders": 120,
  "totalProducts": 40,
  "totalCustomers": 250,
  "pendingOrders": 8,
  "lowStockProducts": 5,
  "newCustomersThisMonth": 12,
  "returnRate": 1.7,
  "ordersByStatus": [
    { "status": "pending", "count": 8 }
  ],
  "topProducts": [
    { "name": "Giấy in Double A A4 80gsm 500 tờ", "sold": 180, "revenue": 16560000 }
  ],
  "revenueByMonth": [
    { "month": "05/2026", "revenue": 45000000, "orders": 22 }
  ]
}
```

Notes:

- `lowStockProducts` means `stock < 100`
- revenue includes orders with status `delivered`, `shipping`, `confirmed`

### `GET /api/dashboard/reports/revenue`

Returns:

```json
{
  "monthly": [
    { "month": "05/2026", "revenue": 45000000, "orders": 22 }
  ],
  "byCategory": [
    { "name": "Bút viết", "revenue": 12000000, "orders": 15 }
  ]
}
```

### `GET /api/dashboard/reports/customers`

Returns cumulative customer growth:

```json
[
  {
    "month": "05/2026",
    "newCustomers": 10,
    "totalCustomers": 250
  }
]
```

## 7.9 Chat

## 7.9.1 Support Chat

### `GET /api/chat/support/conversations`

Protected admin only.

Returns support conversation list:

```json
[
  {
    "userId": "user-2",
    "userName": "Nguyen Van A",
    "userAvatar": "https://...",
    "lastMessageAt": "2026-05-28T12:00:00.000Z",
    "lastMessage": "Cho mình hỏi...",
    "unreadCount": 2
  }
]
```

Important: `staff` cannot access this route because it uses `adminMiddleware`.

### `GET /api/chat/support/messages`

Protected.

Behavior:

- customer: gets own support conversation, no query param needed
- admin/staff: must pass `?userId=...` to fetch a specific customer conversation

Errors for admin/staff:

- `400 { "message": "userId query param required for admin" }`

Response: array of `ChatMessage`

### `POST /api/chat/support/messages`

Protected.

Request from customer:

```json
{ "message": "Cho mình hỏi báo giá..." }
```

Request from admin/staff:

```json
{
  "message": "Bên mình đã nhận yêu cầu",
  "targetUserId": "user-2"
}
```

Success: `201`

```json
{
  "id": "msg-1716900000000-abc12",
  "message": "Message sent"
}
```

Errors:

- `400` missing message
- `400` admin/staff missing `targetUserId`

### `PATCH /api/chat/support/messages/read`

Protected.

Customer request body: empty body allowed.

Admin/staff request:

```json
{ "userId": "user-2" }
```

Response:

```json
{ "message": "Messages marked as read" }
```

## 7.9.2 AI Product Advisor Chat

Customer only. Admin/staff gets:

```json
{ "message": "Tính năng này chỉ dành cho khách hàng" }
```

### `GET /api/chat/ai/messages`

Protected customer only.

Returns AI conversation history for current customer.

### `POST /api/chat/ai/messages`

Protected customer only.

Request:

```json
{ "message": "Mình cần bút viết êm cho học sinh cấp 2" }
```

Success: `201`

```json
{
  "id": "msg-1716900000000-abc12",
  "message": "Message sent",
  "aiMessage": null,
  "aiReplyScheduled": true
}
```

Important behavior:

- customer message is stored immediately
- assistant reply is generated asynchronously
- `aiMessage` is currently always `null` in the immediate response
- if `aiReplyScheduled=true`, frontend should poll `GET /api/chat/ai/messages` or listen to socket `new_message`
- some messages intentionally skip auto-reply if they start with:
  - `[YEU_CAU_BAO_GIA_MUA_SI]`
  - `[YEU_CAU_BAO_GIA_TUY_CHINH]`

AI reply may include `metadata.recommendedProducts`.

### `PATCH /api/chat/ai/messages/read`

Protected customer only.

Response:

```json
{ "message": "Messages marked as read" }
```

## 8. Socket.IO Contract

Base socket URL:

`http://localhost:5000`

Client connection example:

```ts
io("http://localhost:5000", {
  auth: { token: jwtToken },
  transports: ["websocket", "polling"]
})
```

Auth:

- token can be passed in `handshake.auth.token`
- backend also accepts query token, but auth field is preferred

Connection errors:

- missing token => `Unauthorized`
- invalid token => `Invalid token`

Rooms:

- every user joins `user:<userId>`
- admin and staff also join `admin`

### Incoming event: `new_message`

Payload: `ChatMessage`

Behavior:

- customer support messages are emitted to the customer and the `admin` room
- admin/staff support replies are emitted to target customer and `admin` room
- customer AI messages are emitted to the same customer
- AI assistant replies are emitted to the target customer only

Frontend guidance:

- customer widgets can subscribe once and filter by `channel`
- admin support panel should filter for `channel === "support"`
- dedupe incoming messages by `id`

### Outgoing event: `send_message`

Socket send only supports support chat, not AI chat.

Customer payload:

```json
{
  "channel": "support",
  "message": "Cho mình hỏi báo giá..."
}
```

Admin/staff payload:

```json
{
  "channel": "support",
  "message": "Bên mình đã nhận yêu cầu",
  "targetUserId": "user-2"
}
```

Optional callback response:

```json
{ "ok": true, "id": "msg-..." }
```

or

```json
{ "error": "Message is required" }
```

### Outgoing event: `mark_read`

Support chat only.

Customer payload:

```json
{ "channel": "support" }
```

Admin/staff payload:

```json
{ "channel": "support", "userId": "user-2" }
```

## 9. Suggested Frontend Surface Area

Based on actual backend capability, a complete frontend can safely include:

- public home page
- category listing
- product search and filter page
- product detail page
- wishlist page
- cart page
- checkout page
- payment result pages:
  - `/payment/vnpay-return`
  - `/payment/payos-return`
- login/register pages
- profile page:
  - basic profile update
  - password change
  - add address
  - delete address
  - set default address
- order history page
- support chat widget
- AI product advisor widget
- admin pages for:
  - dashboard
  - products
  - categories
  - brands
  - orders
  - vouchers
  - users
  - support chat

Do not build address edit API integration because backend does not support it.

## 10. Known Backend Caveats You Must Respect

1. `GET /api/catalog/products` returns all statuses unless `status` is explicitly provided.
2. `GET /api/vouchers` returns all vouchers, not only active ones.
3. Product `reviews` field inside product payload is not reliable after new reviews. Use `/products/:id/reviews`.
4. There is no address update endpoint.
5. Category create/update does not support editing `image`.
6. Many mutation endpoints return only `{ message }`, `{ ok: true }`, or `{ id }`.
7. Most admin REST routes require real admin role; `staff` is not enough.
8. Locked users are not blocked by login yet.
9. Order creation recalculates totals server-side and may not preserve flash sale price.
10. No pagination exists anywhere.
11. Search suggestion route does not filter inactive products.
12. Admin order search `q` is limited; it matches order id or raw shippingAddress JSON text.

## 11. Recommended Frontend Integration Sequence

1. Auth bootstrap:
   - login/register
   - persist token
   - call `/auth/me` on app init if token exists
2. Public catalog:
   - categories
   - brands
   - products with `status=active`
   - product detail
   - product reviews
3. Customer commerce:
   - wishlist
   - voucher validation
   - checkout
   - payment return pages
   - my orders
   - cancel order
   - return request
4. Customer account:
   - update profile
   - password change
   - address add/delete/default
5. Chat:
   - support widget with socket
   - AI advisor with polling or socket
6. Admin area:
   - dashboard
   - CRUD for catalog/vouchers/users
   - orders management
   - support chat console

This spec reflects the backend implementation at the time of writing and should be used as the source of truth for generating the frontend.
