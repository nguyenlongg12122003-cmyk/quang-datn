# QuangVPP Frontend (frontend-new)

Storefront + admin cho hệ thống văn phòng phẩm QuangVPP, dựng lại trên React 19 + Vite + TypeScript, tiêu thụ API ở `backend/` (Express + SQL Server + Socket.IO).

## Tech stack

- **React 19 + Vite 7 + TypeScript**
- **Tailwind v4 + shadcn/ui** (ưu tiên component thư viện, hạn chế code native)
- **TanStack Query** cho server-state, **axios** cho HTTP, **zustand** cho client-state (auth, cart, chat UI)
- **react-router 7**, **react-hook-form + zod**, **socket.io-client**, **recharts**, **sonner**
- Theme: cyan monochrome `#e8f4f8 #b8d8e8 #88c4d8 #58a8c8 #2890b8` (primary = `#2890b8`)

## Chạy dự án

```bash
# 1. Backend (cổng 5000) — xem backend/README, cần SQL Server + seed dữ liệu
cd ../backend && npm run dev

# 2. Frontend (cổng 5173 — khớp CORS FRONTEND_BASE_URL của backend)
npm install
cp .env.example .env   # chỉnh nếu backend không ở localhost:5000
npm run dev
```

Scripts: `npm run dev` · `npm run build` (tsc + vite) · `npm run lint` · `npm run preview`

## Upload ảnh (Cloudinary)

Các chỗ nhập ảnh (sản phẩm, logo thương hiệu, ảnh đại diện) dùng **upload trực tiếp lên Cloudinary** từ trình duyệt qua *unsigned upload preset* (không cần backend).

Cấu hình `.env`:

```bash
VITE_CLOUDINARY_CLOUD_NAME=<cloud name của bạn>
VITE_CLOUDINARY_UPLOAD_PRESET=<tên upload preset Unsigned>
```

- Lấy **cloud name** ở Cloudinary Dashboard → *Product Environment Credentials*.
- Tạo **upload preset** ở *Settings → Upload → Upload presets*, đặt **Signing Mode = Unsigned**.
- Khi chưa cấu hình, ô upload sẽ hiện cảnh báo thay vì cho tải lên. Khởi động lại dev server sau khi sửa `.env`.
- Giới hạn: JPEG/PNG/WebP/GIF, tối đa 5MB. Helper ở [src/lib/cloudinary.ts](src/lib/cloudinary.ts), component dùng chung ở [src/components/common/ImageUploader.tsx](src/components/common/ImageUploader.tsx).

## Cấu trúc

```
src/
  lib/          axios, endpoints API theo domain, query keys/client, socket, format, constants
  types/        model khớp payload backend (xem API_DOCS_FOR_FRONTEND_AGENT.md)
  stores/       zustand: auth, cart (localStorage), chat UI
  hooks/        useDebounce, useAuthBootstrap, useChatSocket
  features/     auth, catalog, product, orders, account, wishlist, vouchers, chat, admin
  components/   ui (shadcn), layout, common, chat
  pages/        trang customer + pages/admin/*
  routes/       ProtectedRoute, AdminRoute
```

## Ghi chú tích hợp backend (đã tuân thủ)

- Danh sách sản phẩm public luôn gọi `status=active`; phân trang/ lọc ở client (backend không phân trang).
- Cart lưu localStorage (không có cart API); Wishlist đồng bộ qua `/api/wishlist`.
- Không có endpoint **sửa địa chỉ** → chỉ thêm/xóa/đặt mặc định.
- AI chat trả lời bất đồng bộ → poll `/chat/ai/messages` + lắng nghe socket `new_message`.
- Mutation thường trả ack tối thiểu → refetch qua React Query invalidation.
- Hầu hết route admin yêu cầu `role === 'admin'`.
- Tổng tiền đơn được backend tính lại; voucher validate ở client trước khi đặt.
```
