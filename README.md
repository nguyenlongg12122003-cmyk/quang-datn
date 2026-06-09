1. Yêu cầu hệ thống

• Node.js ≥ 18 (khuyến nghị 20+)
• npm
• SQL Server (bắt buộc):
  • SQL Server Express / Developer / full bản
  • Hoặc Azure SQL
  • Phải bật TCP/IP và cho phép kết nối từ localhost
• (Khuyến nghị) Tài khoản Cloudinary (để upload ảnh sản phẩm, avatar...)

2. Các bước sau khi clone

# 1. Clone repo
git clone <repo-url>
cd QuangProject

Bước 2.1: Cài đặt dependencies

# Backend
cd backend
npm install

# Frontend (2 app độc lập — deploy riêng)
cd ../frontend-user
npm install
cd ../frontend-admin
npm install

Bước 2.2: Cấu hình Backend (quan trọng nhất)

cd backend
cp .env.example .env

Mở file .env và chỉnh các thông tin sau:

# JWT
JWT_SECRET=thay-bang-mot-chuoi-bi-mat-manh

# SQL Server
DB_SERVER=localhost          # hoặc tên máy / IP
DB_PORT=1433
DB_USER=sa                   # hoặc user bạn tạo
DB_PASSWORD=YourStrongPass
DB_NAME=VanPhongPham_DB
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true

FRONTEND_BASE_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:5174

│ Lưu ý:
│ • Database VanPhongPham_DB không cần tạo sẵn. Backend sẽ tự tạo toàn bộ bảng khi chạy lần đầu.
│ • Nếu dùng SQL Server Express thường là localhost\SQLEXPRESS.

Bước 2.3: Chạy Backend

cd backend
npm run dev

Lần đầu chạy, backend sẽ:
• Tự động tạo tất cả bảng
• Chạy migration
• Seed dữ liệu mẫu (sản phẩm, danh mục, thương hiệu, voucher, 2 tài khoản test)

Tài khoản test sau khi seed:
┌─────────────────────┬──────────┬──────────┐
│ Email               │ Password │ Role     │
├─────────────────────┼──────────┼──────────┤
│ phanquang@admin.com │ 123456   │ admin    │
├─────────────────────┼──────────┼──────────┤
│ phanquang@user.com  │ 123456   │ customer │
└─────────────────────┴──────────┴──────────┘

Backend chạy mặc định tại: http://localhost:5000

Bước 2.4: Cấu hình & chạy Frontend

Cửa hàng khách hàng (`frontend-user`):

cd frontend-user
cp .env.example .env
npm run dev

→ http://localhost:5173

Quản trị (`frontend-admin`):

cd frontend-admin
cp .env.example .env
npm run dev

→ http://localhost:5174

Biến môi trường chung (cả hai app):

VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

Admin thêm (link về cửa hàng):

VITE_STORE_URL=http://localhost:5173

3. Thứ tự chạy khuyến nghị

1. Khởi động SQL Server
2. Chạy Backend trước (npm run dev)
3. Chạy frontend-user và/hoặc frontend-admin

4. Các tính năng cần cấu hình thêm (không bắt buộc để chạy)

┌──────────────────┬───────────────────────────────────────────────────────────────────────┬───────────────────────────────────────┐
│ Tính năng        │ Biến môi trường cần điền                                              │ Ghi chú                               │
├──────────────────┼───────────────────────────────────────────────────────────────────────┼───────────────────────────────────────┤
│ Upload ảnh       │ VITE_CLOUDINARY_CLOUD_NAME + VITE_CLOUDINARY_UPLOAD_PRESET (Unsigned) │ Rất nên có                            │
├──────────────────┼───────────────────────────────────────────────────────────────────────┼───────────────────────────────────────┤
│ Thanh toán VNPay │ VNPAY_TMN_CODE, VNPAY_SECURE_SECRET                                   │ -                                     │
├──────────────────┼───────────────────────────────────────────────────────────────────────┼───────────────────────────────────────┤
│ Thanh toán PayOS │ PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY                    │ -                                     │
├──────────────────┼───────────────────────────────────────────────────────────────────────┼───────────────────────────────────────┤
│ AI Chat tư vấn   │ OPENROUTER_API_KEY hoặc OPENAI_API_KEY                                │ Có thể tắt bằng AI_CHAT_ENABLED=false │
└──────────────────┴───────────────────────────────────────────────────────────────────────┴───────────────────────────────────────┘

5. Một số lệnh hữu ích (Backend)

npm run seed:reset          # Xóa và seed lại toàn bộ dữ liệu catalog
npm run migrate:backfill-order-items

───

Tóm tắt nhanh sau khi clone:

# Terminal 1 - Backend
cd backend
npm install
cp .env.example .env   # sửa DB_USER, DB_PASSWORD, JWT_SECRET
npm run dev

# Terminal 2 - Cửa hàng
cd frontend-user
npm install
cp .env.example .env
npm run dev

# Terminal 3 - Quản trị (tuỳ chọn)
cd frontend-admin
npm install
cp .env.example .env
npm run dev