# Quang VPP — Hướng dẫn chạy project

Dự án gồm 3 phần: **backend** (Express + SQL Server), **frontend-user** (cửa hàng), **frontend-admin** (quản trị).

Backend có thể chạy bằng **Docker** (khuyến nghị) hoặc **npm local** nếu bạn đã cài SQL Server trên máy.

---

## 1. Yêu cầu hệ thống

### Chạy backend bằng Docker (khuyến nghị)

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS / Linux)
- Docker Compose v2 (đi kèm Docker Desktop)
- RAM trống ≥ 4 GB (SQL Server container cần ~2 GB)

### Chạy frontend (local)

- Node.js ≥ 18 (khuyến nghị 20+)
- npm

### Tuỳ chọn

- Tài khoản Cloudinary — upload ảnh sản phẩm, avatar
- API key VNPay / PayOS / OpenRouter — thanh toán, AI chat

---

## 2. Clone project

```bash
git clone <repo-url>
cd quang-datn
```

---

## 3. Chạy Backend bằng Docker

Docker sẽ tự khởi động **SQL Server** và **Backend API**. Không cần cài SQL Server trên máy, không cần `npm install` trong thư mục `backend`.

### 3.1. Bật Docker Desktop

Đảm bảo Docker Desktop đang ở trạng thái **Running** trước khi chạy lệnh.

### 3.2. Khởi động containers

Tại thư mục gốc project:

```bash
docker compose up -d --build
```

Lần đầu chạy sẽ:

- Tải image SQL Server 2022
- Build image backend từ `backend/Dockerfile`
- Tự tạo database `VanPhongPham_DB`
- Tạo bảng, migration và seed dữ liệu mẫu

Đợi 1–2 phút để SQL Server khởi động xong. Kiểm tra trạng thái:

```bash
docker compose ps
```

Cả hai service `sqlserver` và `backend` phải ở trạng thái `running` (sqlserver: `healthy`).

### 3.3. Kiểm tra backend

```bash
curl http://localhost:5000/api/health
```

Hoặc mở trình duyệt: [http://localhost:5000/api/health](http://localhost:5000/api/health)

Kết quả mong đợi:

```json
{"status":"ok","service":"backend","timestamp":"..."}
```

Xem log nếu cần:

```bash
docker compose logs -f backend
docker compose logs -f sqlserver
```

### 3.4. Tuỳ chỉnh mật khẩu / JWT (khuyến nghị)

Mặc định Docker dùng:

| Biến | Giá trị mặc định |
|------|------------------|
| `MSSQL_SA_PASSWORD` | `YourStrong@Passw0rd` |
| `JWT_SECRET` | `dev-docker-secret-change-me` |

Để đổi, tạo file `.env.docker` từ mẫu:

**Windows (PowerShell / CMD):**

```bash
copy .env.docker.example .env.docker
```

**macOS / Linux:**

```bash
cp .env.docker.example .env.docker
```

Sửa `.env.docker`, rồi chạy:

```bash
docker compose --env-file .env.docker up -d --build
```

### 3.5. Tài khoản test (sau khi seed)

| Email | Password | Role |
|-------|----------|------|
| phanquang@admin.com | 123456 | admin |
| phanquang@user.com | 123456 | customer |

### 3.6. Lệnh Docker thường dùng

```bash
docker compose up -d              # Khởi động (không build lại)
docker compose up -d --build      # Build lại image backend rồi khởi động
docker compose stop               # Dừng containers (giữ dữ liệu)
docker compose down               # Dừng và xoá containers (giữ volume DB)
docker compose down -v            # Dừng + xoá dữ liệu DB (seed lại từ đầu lần sau)
docker compose restart backend    # Restart backend
docker compose logs -f backend    # Theo dõi log backend
```

### 3.7. Cấu trúc Docker

| File | Mô tả |
|------|-------|
| `docker-compose.yml` | Định nghĩa SQL Server + Backend |
| `backend/Dockerfile` | Build image Node.js backend |
| `backend/.dockerignore` | Loại trừ `node_modules`, `.env` khỏi image |
| `.env.docker.example` | Mẫu biến môi trường cho Docker Compose |

**Port mặc định:**

| Service | Port |
|---------|------|
| Backend API | `5000` |
| SQL Server | `1433` |

### 3.8. Xử lý sự cố

**Lỗi `dockerDesktopLinuxEngine: The system cannot find the file specified`**

→ Docker Desktop chưa chạy. Mở Docker Desktop và thử lại.

**Port 1433 đã bị chiếm (SQL Server Express trên Windows)**

Sửa `docker-compose.yml`, đổi mapping port SQL Server:

```yaml
ports:
  - "1434:1433"   # host:container
```

**Port 5000 đã bị chiếm**

Sửa `docker-compose.yml`:

```yaml
ports:
  - "5001:5000"
```

Frontend cần trỏ `VITE_API_URL=http://localhost:5001/api`.

**Backend restart liên tục**

Xem log SQL Server — thường do mật khẩu `sa` không đủ mạnh (cần chữ hoa, chữ thường, số, ký tự đặc biệt, ≥ 8 ký tự):

```bash
docker compose logs sqlserver
```

**Reset toàn bộ dữ liệu**

```bash
docker compose down -v
docker compose up -d --build
```

---

## 4. Chạy Frontend

Frontend chạy local bằng Vite, kết nối tới backend tại `http://localhost:5000`.

### 4.1. Cửa hàng khách hàng (`frontend-user`)

```bash
cd frontend-user
npm install
```

Tạo file `.env`:

**Windows:**

```bash
copy .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Nội dung `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Chạy:

```bash
npm run dev
```

→ [http://localhost:5173](http://localhost:5173)

### 4.2. Quản trị (`frontend-admin`)

```bash
cd frontend-admin
npm install
copy .env.example .env    # Windows
# cp .env.example .env    # macOS / Linux
```

Nội dung `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_STORE_URL=http://localhost:5173
```

Chạy:

```bash
npm run dev
```

→ [http://localhost:5174](http://localhost:5174)

---

## 5. Thứ tự chạy khuyến nghị

1. `docker compose up -d --build` — Backend + SQL Server
2. `npm run dev` trong `frontend-user` và/hoặc `frontend-admin`

---

## 6. Tính năng tuỳ chọn (không bắt buộc để chạy cơ bản)

| Tính năng | Biến môi trường | Ghi chú |
|-----------|-----------------|---------|
| Upload ảnh | `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | Cấu hình ở frontend |
| Thanh toán VNPay | `VNPAY_TMN_CODE`, `VNPAY_SECURE_SECRET` | Thêm vào `docker-compose.yml` hoặc chạy local |
| Thanh toán PayOS | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | Thêm vào `docker-compose.yml` hoặc chạy local |
| AI Chat tư vấn | `OPENROUTER_API_KEY` hoặc `OPENAI_API_KEY` | Mặc định tắt trong Docker (`AI_CHAT_ENABLED=false`) |

Để bật AI Chat trong Docker, thêm vào `environment` của service `backend` trong `docker-compose.yml`:

```yaml
AI_CHAT_ENABLED: "true"
OPENROUTER_API_KEY: your-key-here
```

---

## 7. Chạy Backend local (không dùng Docker)

Dùng khi bạn đã có SQL Server cài sẵn trên máy (Express / Developer / Azure SQL).

```bash
cd backend
npm install
copy .env.example .env    # Windows
# cp .env.example .env    # macOS / Linux
```

Sửa `backend/.env`:

```env
JWT_SECRET=thay-bang-mot-chuoi-bi-mat-manh

DB_SERVER=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=YourStrongPass
DB_NAME=VanPhongPham_DB
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true

FRONTEND_BASE_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:5174
```

> Database `VanPhongPham_DB` không cần tạo sẵn — backend tự tạo bảng khi chạy lần đầu.
> SQL Server Express thường dùng instance `localhost\SQLEXPRESS` — khi đó đặt `DB_SERVER=localhost\SQLEXPRESS`.

Chạy:

```bash
npm run dev
```

Lệnh hữu ích:

```bash
npm run seed:reset                    # Xoá và seed lại catalog
npm run migrate:backfill-order-items  # Backfill order items
```

---

## 8. Tóm tắt nhanh

```bash
# Terminal 1 — Backend + DB (Docker)
cd quang-datn
docker compose up -d --build

# Terminal 2 — Cửa hàng
cd frontend-user
npm install && copy .env.example .env
npm run dev

# Terminal 3 — Quản trị (tuỳ chọn)
cd frontend-admin
npm install && copy .env.example .env
npm run dev
```