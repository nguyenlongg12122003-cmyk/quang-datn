# Hướng dẫn Test Chức năng "Báo giá B2B" trên Giao diện (UI Testing Guide)

**Phiên bản:** Sau khi hoàn thành Phase 1 + 2 + 3 (cập nhật 2026-06-12)
**Mục tiêu:** Hướng dẫn bạn tự test end-to-end trên giao diện (không cần code) để xác nhận các cải tiến:
- User có thể hủy báo giá đang chờ
- Không còn ô nhập chiết khấu khi tạo (luôn = 0)
- Admin có thể chỉnh sửa (chiết khấu + hạn + note + **giá từng dòng**)
- Giải thích giá B2B rõ ràng ở nhiều nơi
- Giá được tính lại đúng, snapshot an toàn khi convert
- Expire và trạng thái hoạt động tốt

**Dữ liệu seed có sẵn (rất quan trọng):**
- Tài khoản B2B đã duyệt:
  - `abcwholesale@business.com` (wholesale)
  - `truongnguyendu@school.edu.vn` (enterprise)
- Một số sản phẩm có `groupPrices` / `wholesalePrice` / `packagingUnits` (bút, giấy, băng keo...).
- Admin: `phanquang@admin.com`

**Yêu cầu trước khi test:**
1. Chạy đầy đủ: Backend + frontend-user + frontend-admin.
2. Dùng trình duyệt (tốt nhất 2 tab/incognito: một user, một admin).
3. Nếu cần reset data: chạy lại seed script trong backend (xem `backend/src/seed/reseedAll.js` hoặc script tương ứng).
4. Đăng nhập user B2B trước → kiểm tra đã có Business Profile "approved" + customerType phù hợp (vào /account).

---

## Flow 1: Tạo báo giá từ giỏ hàng (User side) + Giải thích giá B2B

1. Đăng nhập user B2B (ví dụ abcwholesale@business.com).
2. Vào trang chi tiết sản phẩm có giá sỉ (ví dụ bút bi, giấy in...).
   - **Kiểm tra:** Ở phần giá → có badge "Giá Giá sỉ đang áp dụng (theo hồ sơ doanh nghiệp B2B đã duyệt)" (hoặc enterprise).
3. Chọn packaging (nếu có) + số lượng → Thêm vào giỏ.
4. Vào **Giỏ hàng** (`/cart`).
   - **Kiểm tra:**
     - Có nút "Tạo báo giá B2B".
     - Dưới nút có text giải thích: "Giá B2B/sỉ/đại lý sẽ được áp dụng tự động khi tạo báo giá... Giá trong giỏ là snapshot lẻ."
5. Nhấn "Tạo báo giá B2B".
   - **Kiểm tra quan trọng (Phase 1):**
     - Dialog **không còn** ô "Chiết khấu (VNĐ)".
     - Mô tả dialog có nội dung giải thích rõ: "Tạm tính giỏ hàng (giá bán lẻ hiện tại). Báo giá sẽ được tính lại theo giá B2B... Bạn có thể hủy báo giá đang ở trạng thái 'Đã gửi'..."
6. Nhập "Hiệu lực (ngày)" và Ghi chú → Nhấn "Tạo báo giá".
   - Chuyển sang trang **Báo giá của tôi** (`/quotations`).
7. Kiểm tra quote mới tạo:
   - Status: "Đã gửi"
   - Có dòng "Đang chờ admin duyệt"
   - Nút **"Hủy báo giá"** xuất hiện (màu outline).
   - Nút In/PDF.
   - Khi mở chi tiết → thấy giá đã được tính theo B2B (có thể khác giá giỏ nếu có tier/pack).

**Kết quả mong đợi:** Giá trong báo giá = giá B2B theo customerType của user (server re-price).

---

## Flow 2: Hủy báo giá (User + Admin)

### Từ phía User
1. Ở trang /quotations, trên quote "Đã gửi" chưa hết hạn → nhấn **Hủy báo giá**.
2. Xác nhận dialog.
3. **Kết quả:**
   - Toast "Đã hủy báo giá"
   - Status chuyển thành "Đã hủy"
   - Nút Hủy biến mất.
   - Quote vẫn hiện trong danh sách.

### Từ phía Admin (force)
1. Admin đăng nhập → vào **Báo giá B2B** (`/quotations`).
2. Tìm quote của user vừa hủy hoặc một quote "Đã gửi" khác.
3. Nếu còn nút "Hủy" → nhấn (dùng status 'cancelled').
4. Refresh list user → thấy trạng thái cập nhật.

**Lưu ý:** Quote đã convert hoặc accepted thì không cho hủy.

---

## Flow 3: Admin chỉnh sửa báo giá (có chỉnh giá dòng) + Đàm phán

Đây là tính năng Phase 2 quan trọng nhất.

1. Admin vào /quotations.
2. Tìm một quote status **"Đã gửi"** (chưa hết hạn, chưa converted).
3. Nhấn **"Chỉnh sửa"**.
4. Form hiện ra (inline):
   - Chiết khấu (VNĐ)
   - Hiệu lực đến (datetime-local)
   - Ghi chú (admin)
   - **Phần "Chỉnh giá từng dòng (tùy chọn)"**:
     - Liệt kê từng sản phẩm + input số cho unitPrice.
     - Hiển thị thành tiền bên cạnh.
5. Thực hiện chỉnh:
   - Giảm chiết khấu xuống 0 hoặc tăng nhẹ.
   - Sửa hạn sử dụng dài hơn.
   - Sửa giá 1-2 dòng (ví dụ giảm 1 sản phẩm từ 5000 → 4500).
   - Thêm ghi chú: "Giá đã điều chỉnh theo thỏa thuận 12/06".
6. Nhấn **"Lưu chỉnh sửa"**.
7. **Kết quả mong đợi:**
   - Toast thành công.
   - Tổng tiền và tạm tính **tự động tính lại** ở cả admin và user.
   - Giá dòng bị sửa thay đổi.
   - Ghi chú mới hiện khi mở chi tiết.
   - User refresh /quotations → thấy thay đổi ngay (không cần logout).

8. Sau khi chỉnh xong:
   - Admin nhấn **"Chấp nhận"**.
   - User vào quote → nút **"Chuyển thành đơn hàng"** xuất hiện.

**Test thêm:**
- Thử chỉnh quote đã "Đã duyệt" → bị chặn (chỉ cho sent/draft).
- Thử set hạn ở quá khứ → báo lỗi "Ngày hết hạn phải ở tương lai".

---

## Flow 4: Chuyển báo giá thành đơn hàng (Convert)

1. User (sau khi admin chấp nhận) vào quote đã "Đã duyệt".
2. Nhấn "Chuyển thành đơn hàng".
3. Trong dialog:
   - Chọn địa chỉ.
   - Chọn thanh toán (COD hoặc Công nợ nếu có hạn mức).
   - **Kiểm tra:** Nếu total > availableCredit → báo lỗi "Đơn hàng vượt hạn mức công nợ còn lại".
4. Xác nhận.
5. **Kết quả:**
   - Tạo đơn thành công.
   - Quote chuyển status "Đã chuyển đơn".
   - Có link đến đơn hàng.
   - Đơn hàng có `quotationId` (liên kết).
   - Giá và discount trong đơn = giá đã chỉnh ở báo giá (snapshot).

**Kiểm tra thêm:** Vào chi tiết đơn → thấy đúng giá B2B đã negotiate.

---

## Flow 5: Hết hạn (Expire) + Các trường hợp lỗi

- Tạo quote với validDays = 1.
- Chờ hoặc chỉnh validUntil về quá khứ (qua admin).
- Refresh list → status tự động thành **"Hết hạn"** (màu destructive).
- Thử hủy / convert / chỉnh → bị chặn với message rõ ràng.

Các case lỗi khác:
- User chưa approved B2B → không thấy nút tạo báo giá, trang /quotations hiện empty state + nút đăng ký.
- Non-owner cố cancel → 403.
- Tạo quote không có item → lỗi.

---

## Kiểm tra in ấn (Print)

- Trên bất kỳ quote nào (user hoặc admin) → nhấn "In/PDF báo giá" hoặc "In báo giá".
- Tab mới mở → nội dung đẹp, có mã, ngày tạo, HSD, danh sách items (với packaging), chiết khấu (nếu >0), tổng, ghi chú, footer.
- Dùng Ctrl+P hoặc nút in của trình duyệt.

---

## Kiểm tra dữ liệu cũ (Backward compatibility)

- Tìm quote cũ trong seed (quo-001, quo-002...) hoặc quote đã có discount từ trước.
- Vẫn hiển thị, in, convert bình thường.
- Chỉ các quote mới tạo sau fix mới có discount=0 ban đầu.

---

## Reset & Lặp lại test

- Nếu muốn test lại từ đầu:
  1. Xóa các quotation test (qua admin hoặc DB).
  2. Hoặc reseed toàn bộ.
  3. Đảm bảo business_profiles của user test ở trạng thái "approved" và có creditLimit + paymentTermDays > 0.

---

## Checklist nhanh khi test xong

- [ ] User tạo quote không có ô discount
- [ ] Giải thích B2B xuất hiện ở Product detail, Cart, Create dialog, Quotations page
- [ ] User có thể hủy quote "Đã gửi"
- [ ] Admin chỉnh được discount + hạn + note + **giá từng dòng** → totals cập nhật đúng
- [ ] Sau khi admin Accept → user convert được, giá trong đơn khớp
- [ ] Expire hoạt động (lazy + eager trên action)
- [ ] Không làm hỏng quote cũ / đơn đã convert
- [ ] Build / type check không lỗi (nếu bạn chạy)

---

**Lưu ý bảo mật & UX:**
- Mọi thay đổi giá/discount đều do admin thực hiện (server recompute).
- User chỉ còn quyền tạo (với giá B2B hiện tại) + hủy trước khi duyệt.
- Credit check vẫn được thực thi khi convert (ở dialog + backend).

Nếu gặp lỗi cụ thể trong quá trình test (message lạ, giá không khớp, nút không hiện...), hãy chụp màn hình + mô tả flow + paste console error cho tôi để hỗ trợ nhanh.

Chúc bạn test thành công! Sau khi test xong, bạn có thể merge các thay đổi theo quy trình git của dự án. 

(Guide này được tạo tự động sau khi thực hiện Phase 2 + 3 theo plan.)