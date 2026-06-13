# Hướng dẫn dùng Barcode to PC với Quản lý kho (Admin)

Tài liệu hướng dẫn sử dụng **Barcode to PC** để demo và vận hành tính năng quét barcode trên trang **Kho hàng** (`/inventory`) của admin — **không cần sửa code**.

---

## Tổng quan

**Barcode to PC** gồm 2 phần:

| Thành phần | Vai trò |
|------------|---------|
| **Server** (cài trên laptop/PC) | Nhận mã từ điện thoại, mô phỏng bàn phím gõ vào ô đang focus |
| **App mobile** (Android / iOS) | Dùng camera điện thoại quét barcode, gửi mã qua WiFi |

Luồng hoạt động:

```
Điện thoại (app quét)  ←—— WiFi LAN ——→  Laptop (server)
                                              ↓
                                    Gõ mã vào ô đang focus
                                              ↓
                         Trang admin Kho hàng → API tìm sản phẩm
```

Trang admin hiện có sẵn ô **「Quét barcode / SKU」** và API `GET /api/inventory/by-barcode/:code` (tìm theo `barcode`, `SKU`, hoặc `id` sản phẩm).

---

## Yêu cầu

- Laptop/PC chạy Windows (có bản macOS/Linux nhưng hướng dẫn này tập trung Windows)
- Điện thoại Android hoặc iPhone
- Cùng mạng WiFi (hoặc hotspot điện thoại)
- Backend + frontend admin đang chạy
- Dữ liệu sản phẩm đã có trường `barcode` (seed hoặc nhập thủ công trong admin)

---

## Bước 1 — Cài Server trên laptop (Windows)

1. Truy cập [barcodetopc.com/download](https://barcodetopc.com/download)
2. Tải **Barcode to PC Server** cho Windows
3. Cài đặt (nếu hỏi cài Bonjour → chọn **Có**)
4. Mở **Barcode to PC Server** — icon xuất hiện ở khay hệ thống (system tray)
5. Vào **Settings** → bật **Enable Keyboard Emulation**

> Bản miễn phí đủ dùng cho demo đồ án. Bản trả phí chỉ cần khi triển khai thương mại dài hạn.

Tài liệu chính thức: [docs.barcodetopc.com](https://docs.barcodetopc.com/)

---

## Bước 2 — Cài App trên điện thoại

| Hệ điều hành | Link tải |
|--------------|----------|
| Android | [Google Play – Barcode to PC](https://play.google.com/store/apps/details?id=com.barcodetopc) |
| iPhone | [App Store – Barcode to PC](https://apps.apple.com/app/id1180168368) |

Cài xong → mở app → cấp quyền **Camera**.

---

## Bước 3 — Kết nối điện thoại với laptop

**Điều kiện bắt buộc:** Laptop và điện thoại **cùng mạng WiFi** (laptop cắm dây LAN nhưng cùng router với WiFi điện thoại vẫn được).

### Cách A — Tự động (thử trước)

1. Server đang chạy trên laptop
2. Mở app trên điện thoại
3. Đợi vài giây → trạng thái **Connected**

### Cách B — Quét QR (khi không tự kết nối)

1. Trên laptop: mở server → **Info** → hiện mã QR
2. Trên điện thoại: menu ☰ → **Select server** → icon quét → quét QR trên màn hình laptop

### Cách C — Nhập IP thủ công

1. Trên laptop: `Win + R` → `cmd` → Enter → gõ `ipconfig`
2. Ghi **IPv4 Address**, ví dụ `192.168.1.105`
3. Trên điện thoại: menu → **Select server** → **+ ADD SERVER** → nhập IP

### Không có WiFi (phòng trường, lab)

1. Bật **Personal Hotspot / Phát WiFi** trên điện thoại
2. Laptop kết nối vào hotspot đó
3. Kết nối server bằng Cách B hoặc C

> **Không cần internet** — chỉ cần mạng LAN nội bộ. Server dùng port **57891 TCP**.

---

## Bước 4 — Cấu hình tự bấm Enter (khuyến nghị)

Trang Kho hàng chỉ tìm sản phẩm khi nhận phím **Enter** sau mã. Cấu hình **Output Template** một lần:

1. Trên laptop: mở server → icon **Settings** (bánh răng)
2. Kéo component **BARCODE** vào **Output template**
3. Kéo thêm component **ENTER** ngay sau BARCODE
4. Lưu cấu hình

Thứ tự đúng:

```
[ BARCODE ] → [ ENTER ]
```

Sau khi cấu hình: quét xong → mã được gõ + Enter tự động → sản phẩm được chọn ngay.

**Nếu chưa cấu hình ENTER:** sau khi quét, bấm **Enter** trên laptop một lần — vẫn dùng được.

Tài liệu component ENTER: [docs.barcodetopc.com/output-template/components/enter](https://docs.barcodetopc.com/output-template/components/enter/)

---

## Bước 5 — Sử dụng với trang Quản lý kho

### Chuẩn bị dữ liệu

1. Chạy backend và frontend admin
2. Đảm bảo database đã seed (hoặc nhập `barcode` cho sản phẩm trong admin → Sửa sản phẩm → tab giá/kho)
3. In tem barcode trên giấy (khuyến nghị cho demo):
   - Tạo mã tại [barcode.tec-it.com](https://barcode.tec-it.com)
   - Chọn định dạng **EAN-13** hoặc **Code 128**
   - In to, rõ trên giấy A4

### Mã barcode có sẵn trong seed

| Mã barcode | Sản phẩm |
|------------|----------|
| `8935009100127` | Bút bi Thiên Long TL-027 |
| `8850001234567` | Giấy in Double A A4 80gsm |
| `8935009100456` | Sổ tay Deli A5 200 trang |
| `8935009100999` | Con dấu số tự động Deli 8 số (tồn thấp) |

### Quy trình thao tác

| Bước | Việc làm |
|------|----------|
| 1 | Mở **Barcode to PC Server** trên laptop (chạy nền suốt phiên làm việc) |
| 2 | Kiểm tra app điện thoại: trạng thái **Connected** |
| 3 | Laptop: đăng nhập admin → vào **Kho hàng** (`/inventory`) |
| 4 | **Click** vào ô **「Quét barcode / SKU」** — con trỏ phải nhấp nháy trong ô |
| 5 | Điện thoại: bấm nút **camera** → quét tem trên giấy |
| 6 | Laptop: mã xuất hiện trong ô → toast **「Đã chọn: …」** |
| 7 | Chọn loại (**Nhập kho** / **Xuất kho** / **Kiểm kê**), nhập số lượng, lý do |
| 8 | Bấm **Cập nhật kho** → kiểm tra **Lịch sử biến động kho** |

### Demo bảo vệ đồ án (gợi ý 2–3 phút)

1. Quét `8935009100127` → chỉ sản phẩm được chọn tự động
2. **Nhập kho**, SL = `10`, lý do = `Demo bảo vệ đồ án` → **Cập nhật kho**
3. Kéo xuống bảng lịch sử → chỉ dòng **Nhập kho** mới
4. (Tuỳ chọn) Quét `8935009100999` → chỉ mục **Cảnh báo tồn thấp** bên phải

### Cách trình bày với hội đồng

> *"Em dùng điện thoại làm máy quét barcode qua WiFi. App quét gửi mã về laptop, server mô phỏng bàn phím gõ vào ô nhập. Backend tra cứu qua API `/inventory/by-barcode` và chọn sản phẩm — cùng luồng với máy quét USB trong thực tế."*

---

## Xử lý lỗi thường gặp

### App không tìm thấy laptop

- [ ] Laptop và điện thoại cùng WiFi / hotspot
- [ ] Server đang chạy (icon trong system tray)
- [ ] Windows Firewall cho phép **Barcode to PC Server** (port **57891 TCP**, **5353 UDP**)
- [ ] Tắt VPN
- [ ] Thử kết nối bằng QR hoặc nhập IP thủ công

Hướng dẫn firewall: [barcodetopc.com — Configure Windows Firewall](https://barcodetopc.com/tutorial/configure-windows-firewall)

### Quét được nhưng laptop không gõ gì

- [ ] Đã **click** vào ô input trên trang admin trước khi quét
- [ ] **Enable Keyboard Emulation** đã bật trong server
- [ ] Chạy server **Run as administrator** (chuột phải icon → Run as administrator)
- [ ] Tắt **Unikey** / bộ gõ tiếng Việt khi demo

### Quét mã nhưng web báo "Không tìm thấy sản phẩm theo mã"

- [ ] Database đã seed hoặc sản phẩm có `barcode` khớp mã in trên giấy
- [ ] Backend đang chạy (`/api/inventory/by-barcode/:code` phản hồi bình thường)
- [ ] Mã in trên giấy đúng (so sánh từng chữ số)

### Quét chậm hoặc không nhận

- In barcode **to, rõ**, nền trắng
- Đủ ánh sáng, giữ điện thoại ổn (~15–20 cm)
- Ưu tiên **EAN-13** (13 chữ số) — được hỗ trợ tốt trên cả Android và iOS

Danh sách định dạng hỗ trợ: [barcodetopc.com/supported-barcode-formats](https://barcodetopc.com/supported-barcode-formats/)

---

## Checklist trước ngày demo / bảo vệ

```
□ Cài Barcode to PC Server (Windows) + app điện thoại
□ Kết nối WiFi / hotspot thành công (Connected)
□ Output template: BARCODE → ENTER
□ Keyboard Emulation: bật
□ Backend + admin chạy ổn định
□ Database có barcode mẫu
□ In 2–3 tem barcode trên giấy
□ Test đầy đủ: quét → chọn SP → cập nhật kho → lịch sử
□ Dự phòng: gõ tay 8935009100127 + Enter
□ Tắt Unikey / IME tiếng Việt khi demo
□ Zoom trình duyệt 125–150% để hội đồng nhìn rõ
```

---

## So sánh với các cách khác

| Cách | Cần sửa code? | Chi phí | Độ mượt demo |
|------|---------------|---------|--------------|
| Gõ mã + Enter | Không | 0đ | Thấp |
| App quét + copy/dán | Không | 0đ | Trung bình |
| **Barcode to PC** | Không | 0đ (bản free) | Cao |
| Máy quét USB | Không | ~200–400k | Rất cao |
| Camera trong web admin | Có | 0đ | Rất cao |

---

## Liên kết hữu ích

- Trang chủ: [barcodetopc.com](https://barcodetopc.com/)
- Tải server / app: [barcodetopc.com/download](https://barcodetopc.com/download)
- Tài liệu: [docs.barcodetopc.com](https://docs.barcodetopc.com/)
- Keyboard Emulation: [docs.barcodetopc.com/keyboard-emulation](https://docs.barcodetopc.com/keyboard-emulation/)
- FAQ: [barcodetopc.com/frequently-asked-questions](https://barcodetopc.com/frequently-asked-questions/)

---

## Ghi chú kỹ thuật (tham khảo)

- API tra cứu: `GET /api/inventory/by-barcode/:code`
- Điều chỉnh tồn: `POST /api/inventory/adjust`
- Trường `barcode` trên bảng `products`; lịch sử ghi vào `stock_movements`
- Tồn kho tự trừ khi khách đặt hàng (`type: sale`); hoàn khi hủy đơn / thanh toán thất bại (`type: return`)