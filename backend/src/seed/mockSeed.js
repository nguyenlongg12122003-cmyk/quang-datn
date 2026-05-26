const bcrypt = require('bcryptjs');

const FLASH_SALE_END = '2026-12-31T17:00:00Z';

const imageLibrary = {
  deskOrganizer: 'https://images.unsplash.com/photo-1707413463619-8f4926d225ba?auto=format&fit=crop&w=1200&q=80',
  plannerNotebook: 'https://images.unsplash.com/photo-1692158962119-8103c7d78c86?auto=format&fit=crop&w=1200&q=80',
  archiveBinders: 'https://images.unsplash.com/photo-1768158989131-64cbff67f292?auto=format&fit=crop&w=1200&q=80',
  calculatorDesk: 'https://images.unsplash.com/photo-1762427354397-854a52e0ded7?auto=format&fit=crop&w=1200&q=80',
  tapeDispenser: 'https://images.unsplash.com/photo-1760376208573-49ee415fc66c?auto=format&fit=crop&w=1200&q=80',
  deskSetup: 'https://images.unsplash.com/photo-1766555766657-ea8f81a67934?auto=format&fit=crop&w=1200&q=80',
  binderClips: 'https://images.unsplash.com/photo-1743751775247-cce898809911?auto=format&fit=crop&w=1200&q=80',
  ringBinder: 'https://images.unsplash.com/photo-1701895204587-bc24c6a6e3c4?auto=format&fit=crop&w=1200&q=80',
  stationeryFlatlay: 'https://images.unsplash.com/photo-1766961557635-c1dd55b31ab9?auto=format&fit=crop&w=1200&q=80',
  stapler: 'https://images.unsplash.com/photo-1764025851210-9ad5ed83e01f?auto=format&fit=crop&w=1200&q=80',
};

const categorySeeds = [
  { id: 'cat-pen', name: 'Bút viết', slug: 'but-viet', icon: 'PenTool', description: 'Bút bi, bút gel, bút lông bảng và bút dạ quang cho học tập, văn phòng.', image: imageLibrary.stationeryFlatlay },
  { id: 'cat-paper', name: 'Giấy & Sổ', slug: 'giay-so', icon: 'BookOpen', description: 'Giấy in, sổ tay, sổ lò xo, giấy note dùng hằng ngày.', image: imageLibrary.plannerNotebook },
  { id: 'cat-fastener', name: 'Ghim, Kẹp & Bấm kim', slug: 'ghim-kep-bam-kim', icon: 'Paperclip', description: 'Kẹp bướm, kẹp giấy, ghim bấm và máy bấm kim cho xử lý tài liệu.', image: imageLibrary.binderClips },
  { id: 'cat-file', name: 'Hồ sơ & Lưu trữ', slug: 'ho-so-luu-tru', icon: 'Folder', description: 'Bìa lá, file còng, túi hồ sơ và hộp tài liệu phục vụ lưu trữ.', image: imageLibrary.archiveBinders },
  { id: 'cat-adhesive', name: 'Keo dán & Băng keo', slug: 'keo-dan-bang-keo', icon: 'Package', description: 'Băng keo trong, băng keo giấy, keo khô và hồ nước cho nhu cầu đóng gói, dán nhãn.', image: imageLibrary.tapeDispenser },
  { id: 'cat-cutting', name: 'Dụng cụ cắt & Đo', slug: 'dung-cu-cat-do', icon: 'Scissors', description: 'Kéo, dao rọc giấy, thước kẻ và compa cho học tập, thiết kế cơ bản.', image: imageLibrary.deskSetup },
  { id: 'cat-calculator', name: 'Máy tính & Dụng cụ bàn', slug: 'may-tinh-dung-cu-ban', icon: 'Calculator', description: 'Máy tính, máy đục lỗ, bấm kim cỡ lớn và dụng cụ xử lý chứng từ.', image: imageLibrary.calculatorDesk },
  { id: 'cat-desk', name: 'Phụ kiện bàn làm việc', slug: 'phu-kien-ban-lam-viec', icon: 'Archive', description: 'Khay tài liệu, cốc bút, bảng note và phụ kiện tối ưu góc làm việc.', image: imageLibrary.deskOrganizer },
];

const brands = [
  { id: 'brand-thienlong', name: 'Thiên Long', logo: null },
  { id: 'brand-flexoffice', name: 'FlexOffice', logo: null },
  { id: 'brand-deli', name: 'Deli', logo: null },
  { id: 'brand-pentel', name: 'Pentel', logo: null },
  { id: 'brand-doublea', name: 'Double A', logo: null },
  { id: 'brand-ikplus', name: 'IK Plus', logo: null },
  { id: 'brand-plus', name: 'PLUS', logo: null },
  { id: 'brand-3m', name: '3M', logo: null },
  { id: 'brand-casio', name: 'Casio', logo: null },
];

const users = [
  { id: 'user-1', email: 'phanquang@admin.com', name: 'Phan Quang Admin', phone: '0901234567', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=phanquang-admin', role: 'admin', status: 'active', createdAt: '2025-12-01T00:00:00Z' },
  { id: 'user-2', email: 'phanquang@user.com', name: 'Phan Quang User', phone: '0912345678', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=phanquang-user', role: 'customer', status: 'active', createdAt: '2026-01-12T00:00:00Z' },
];

const addresses = [
  { id: 'addr-1', userId: 'user-1', name: 'Phan Quang Admin', phone: '0901234567', street: '123 Nguyễn Huệ', ward: 'Bến Nghé', district: 'Quận 1', city: 'TP. Hồ Chí Minh', isDefault: true },
  { id: 'addr-2', userId: 'user-2', name: 'Phan Quang User', phone: '0912345678', street: '45 Lê Lợi', ward: 'Phường 2', district: 'Quận 3', city: 'TP. Hồ Chí Minh', isDefault: true },
];

const vouchers = [
  { id: 'v-1', code: 'WELCOME20K', type: 'fixed', value: 20000, minOrderValue: 150000, maxDiscount: null, usageLimit: 1000, usedCount: 212, startDate: '2026-01-01T00:00:00Z', endDate: '2026-12-31T23:59:59Z', status: 'active', description: 'Giảm 20.000đ cho đơn từ 150.000đ' },
  { id: 'v-2', code: 'BULK5', type: 'percentage', value: 5, minOrderValue: 300000, maxDiscount: 50000, usageLimit: 500, usedCount: 81, startDate: '2026-01-01T00:00:00Z', endDate: '2026-10-31T23:59:59Z', status: 'active', description: 'Giảm 5% cho đơn mua sỉ, tối đa 50.000đ' },
  { id: 'v-3', code: 'FREESHIP30', type: 'fixed', value: 30000, minOrderValue: 250000, maxDiscount: null, usageLimit: 300, usedCount: 57, startDate: '2026-03-01T00:00:00Z', endDate: '2026-09-30T23:59:59Z', status: 'active', description: 'Hỗ trợ phí vận chuyển 30.000đ cho đơn từ 250.000đ' },
];

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeImages(imageKey, alt, productId) {
  const fallbackAlt = alt || 'Hình sản phẩm văn phòng phẩm';
  return [
    { id: `${productId}-img-1`, url: imageLibrary[imageKey], alt: fallbackAlt },
  ];
}

function calcDiscount(price, originalPrice) {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

const reviewSeeds = [
  { id: 'rev-001', productId: 'prod-001', userId: 'user-2', rating: 5, comment: 'Mực ra đều, viết êm tay, phù hợp phát cho nhân viên dùng hàng ngày.', helpful: 4, isVerifiedPurchase: true, createdAt: '2026-03-12T08:15:00Z' },
  { id: 'rev-002', productId: 'prod-001', userId: 'user-2', rating: 4, comment: 'Giá tốt, thân bút cầm chắc, giao đủ số lượng.', helpful: 2, isVerifiedPurchase: true, createdAt: '2026-04-01T09:30:00Z' },
  { id: 'rev-003', productId: 'prod-003', userId: 'user-2', rating: 5, comment: 'Mực khô nhanh, nét mượt, dùng ký chứng từ rất ổn.', helpful: 3, isVerifiedPurchase: true, createdAt: '2026-04-10T14:45:00Z' },
  { id: 'rev-004', productId: 'prod-006', userId: 'user-2', rating: 5, comment: 'Giấy trắng đẹp, chạy máy in văn phòng ổn định, không kẹt giấy.', helpful: 6, isVerifiedPurchase: true, createdAt: '2026-03-22T10:00:00Z' },
  { id: 'rev-005', productId: 'prod-009', userId: 'user-2', rating: 4, comment: 'Giấy note bám dính tốt, màu vàng dễ nhìn.', helpful: 1, isVerifiedPurchase: true, createdAt: '2026-04-08T07:20:00Z' },
  { id: 'rev-006', productId: 'prod-015', userId: 'user-2', rating: 4, comment: 'Máy bấm kim nhỏ gọn, bấm êm với tờ ít.', helpful: 1, isVerifiedPurchase: true, createdAt: '2026-04-12T15:30:00Z' },
  { id: 'rev-007', productId: 'prod-018', userId: 'user-2', rating: 5, comment: 'File còng cứng cáp, gáy dày đúng nhu cầu lưu hợp đồng.', helpful: 2, isVerifiedPurchase: true, createdAt: '2026-03-28T11:50:00Z' },
  { id: 'rev-008', productId: 'prod-022', userId: 'user-2', rating: 4, comment: 'Keo khô dễ dùng, không lem giấy khi dán thủ công.', helpful: 1, isVerifiedPurchase: true, createdAt: '2026-04-15T13:10:00Z' },
  { id: 'rev-009', productId: 'prod-026', userId: 'user-2', rating: 5, comment: 'Kéo cắt ngọt, tay cầm chắc, dùng giấy và decal đều ổn.', helpful: 2, isVerifiedPurchase: true, createdAt: '2026-04-17T08:05:00Z' },
  { id: 'rev-010', productId: 'prod-031', userId: 'user-2', rating: 5, comment: 'Casio bấm rất nhạy, màn hình rõ, đúng loại văn phòng cần.', helpful: 3, isVerifiedPurchase: true, createdAt: '2026-03-30T16:40:00Z' },
  { id: 'rev-011', productId: 'prod-036', userId: 'user-2', rating: 4, comment: 'Khay tài liệu đẹp, dễ lắp, giúp bàn làm việc gọn hơn.', helpful: 1, isVerifiedPurchase: true, createdAt: '2026-04-18T09:15:00Z' },
  { id: 'rev-012', productId: 'prod-038', userId: 'user-2', rating: 5, comment: 'Ống cắm bút lưới cứng, sơn đều, không bị sắc cạnh.', helpful: 2, isVerifiedPurchase: true, createdAt: '2026-04-20T10:25:00Z' },
];

const reviewsByProduct = reviewSeeds.reduce((acc, review) => {
  const user = users.find((item) => item.id === review.userId);
  const mapped = {
    id: review.id,
    userId: review.userId,
    userName: user?.name || '',
    userAvatar: user?.avatar || '',
    rating: review.rating,
    comment: review.comment,
    helpful: review.helpful,
    isVerifiedPurchase: review.isVerifiedPurchase,
    createdAt: review.createdAt,
  };
  if (!acc[review.productId]) acc[review.productId] = [];
  acc[review.productId].push(mapped);
  return acc;
}, {});

const productSeeds = [
  { id: 'prod-001', name: 'Bút bi Thiên Long TL-027 0.5mm', sku: 'TL-TL027-05', categoryId: 'cat-pen', brandId: 'brand-thienlong', price: 6000, originalPrice: 7000, imageKey: 'stationeryFlatlay', description: 'Bút bi đầu 0.5mm cho nét mảnh, thân nhựa trong giúp theo dõi lượng mực dễ dàng.', specifications: { 'Loại bút': 'Bút bi', 'Đầu bi': '0.5mm', 'Màu mực': 'Xanh', 'Chất liệu thân': 'Nhựa' }, stock: 420, sold: 980, rating: 4.7, reviewCount: 42, colors: ['Xanh', 'Đỏ', 'Đen'], tags: ['bút bi', 'thiên long', 'văn phòng'], isFlashSale: true, flashSalePrice: 5000, flashSaleEnd: FLASH_SALE_END, isCustomizable: true, customizationOptions: ['In tên', 'In logo công ty'], wholesalePrice: [{ minQty: 50, price: 5400 }, { minQty: 200, price: 5000 }], createdAt: '2026-01-05T00:00:00Z', status: 'active' },
  { id: 'prod-002', name: 'Bút bi FlexOffice FO-03 0.7mm', sku: 'FO-FO03-07', categoryId: 'cat-pen', brandId: 'brand-flexoffice', price: 5000, originalPrice: 6000, imageKey: 'stationeryFlatlay', description: 'Bút bi đầu 0.7mm cho nét đậm hơn, phù hợp ghi chép tốc độ cao tại quầy thu ngân hoặc văn phòng.', specifications: { 'Loại bút': 'Bút bi', 'Đầu bi': '0.7mm', 'Màu mực': 'Đen', 'Kiểu bấm': 'Nắp đậy' }, stock: 360, sold: 740, rating: 4.5, reviewCount: 31, colors: ['Đen', 'Xanh'], tags: ['bút bi', 'flexoffice'], wholesalePrice: [{ minQty: 50, price: 4500 }, { minQty: 200, price: 4200 }], createdAt: '2026-01-08T00:00:00Z', status: 'active' },
  { id: 'prod-003', name: 'Bút gel Pentel EnerGel BLN105 0.5mm', sku: 'PT-BLN105-05', categoryId: 'cat-pen', brandId: 'brand-pentel', price: 42000, originalPrice: 49000, imageKey: 'plannerNotebook', description: 'Bút gel Pentel EnerGel cho tốc độ khô mực nhanh, phù hợp ký chứng từ và ghi chú chuyên nghiệp.', specifications: { 'Loại bút': 'Bút gel', 'Đầu bút': '0.5mm', 'Màu mực': 'Đen', 'Cơ chế': 'Bấm' }, stock: 120, sold: 285, rating: 4.8, reviewCount: 14, colors: ['Đen', 'Xanh navy'], tags: ['pentel', 'energel', 'bút gel'], createdAt: '2026-01-10T00:00:00Z', status: 'active' },
  { id: 'prod-004', name: 'Bút lông bảng Thiên Long WB-02', sku: 'TL-WB02-BK', categoryId: 'cat-pen', brandId: 'brand-thienlong', price: 15000, originalPrice: 18000, imageKey: 'deskSetup', description: 'Bút lông bảng mực đậm, dễ xóa trên bảng trắng, dùng tốt cho lớp học và phòng họp.', specifications: { 'Loại bút': 'Bút lông bảng', 'Màu mực': 'Đen', 'Đầu bút': 'Tròn 2mm', 'Bề mặt phù hợp': 'Bảng trắng' }, stock: 210, sold: 410, rating: 4.4, reviewCount: 18, colors: ['Đen', 'Đỏ', 'Xanh'], tags: ['bút bảng', 'thiên long'], wholesalePrice: [{ minQty: 20, price: 13500 }, { minQty: 100, price: 12000 }], createdAt: '2026-01-12T00:00:00Z', status: 'active' },
  { id: 'prod-005', name: 'Bút dạ quang Deli S600', sku: 'DL-S600-YL', categoryId: 'cat-pen', brandId: 'brand-deli', price: 13000, originalPrice: 16000, imageKey: 'stationeryFlatlay', description: 'Bút dạ quang màu vàng nổi bật, đầu vát giúp tô dòng nhanh và đều màu.', specifications: { 'Loại bút': 'Bút dạ quang', 'Màu mực': 'Vàng', 'Đầu bút': 'Vát', 'Độ rộng nét': '1-5mm' }, stock: 190, sold: 365, rating: 4.6, reviewCount: 22, colors: ['Vàng', 'Cam', 'Xanh lá'], tags: ['dạ quang', 'deli'], createdAt: '2026-01-14T00:00:00Z', status: 'active' },

  { id: 'prod-006', name: 'Giấy in Double A A4 80gsm 500 tờ', sku: 'DA-A4-80-500', categoryId: 'cat-paper', brandId: 'brand-doublea', price: 92000, originalPrice: 105000, imageKey: 'plannerNotebook', description: 'Giấy in A4 định lượng 80gsm, bề mặt mịn, trắng sáng, dùng tốt cho máy in laser và inkjet.', specifications: { 'Kích thước': 'A4', 'Định lượng': '80gsm', 'Quy cách': '500 tờ/ream', 'Độ trắng': 'CIE 165' }, stock: 560, sold: 1280, rating: 4.9, reviewCount: 56, tags: ['giấy in', 'double a', 'a4'], colors: ['Trắng'], isFlashSale: true, flashSalePrice: 87000, flashSaleEnd: FLASH_SALE_END, wholesalePrice: [{ minQty: 10, price: 89000 }, { minQty: 50, price: 86000 }], createdAt: '2026-01-16T00:00:00Z', status: 'active' },
  { id: 'prod-007', name: 'Giấy in IK Plus A4 70gsm 500 tờ', sku: 'IK-A4-70-500', categoryId: 'cat-paper', brandId: 'brand-ikplus', price: 76000, originalPrice: 86000, imageKey: 'plannerNotebook', description: 'Giấy in IK Plus 70gsm là lựa chọn tiết kiệm cho nhu cầu in chứng từ, biểu mẫu số lượng lớn.', specifications: { 'Kích thước': 'A4', 'Định lượng': '70gsm', 'Quy cách': '500 tờ/ream', 'Độ tương thích': 'Laser/Inkjet/Copier' }, stock: 430, sold: 890, rating: 4.5, reviewCount: 29, tags: ['giấy in', 'ik plus'], colors: ['Trắng'], wholesalePrice: [{ minQty: 10, price: 73000 }, { minQty: 50, price: 70000 }], createdAt: '2026-01-18T00:00:00Z', status: 'active' },
  { id: 'prod-008', name: 'Sổ tay Deli A5 200 trang bìa giả da', sku: 'DL-NB-A5-200', categoryId: 'cat-paper', brandId: 'brand-deli', price: 69000, originalPrice: 79000, imageKey: 'plannerNotebook', description: 'Sổ tay A5 bìa giả da, giấy kem định lượng vừa phải, thích hợp ghi chép công việc và lịch họp.', specifications: { 'Kích thước': 'A5', 'Số trang': '200', 'Chất liệu bìa': 'Giả da', 'Ruột giấy': 'Giấy kem kẻ ngang' }, stock: 145, sold: 248, rating: 4.6, reviewCount: 19, colors: ['Đen', 'Nâu', 'Xanh navy'], tags: ['sổ tay', 'deli', 'a5'], isCustomizable: true, customizationOptions: ['Dập tên', 'In logo bìa'], wholesalePrice: [{ minQty: 20, price: 62000 }, { minQty: 50, price: 58000 }], createdAt: '2026-01-20T00:00:00Z', status: 'active' },
  { id: 'prod-009', name: 'Giấy note 3M Post-it 654 76x76mm', sku: '3M-654-YW', categoryId: 'cat-paper', brandId: 'brand-3m', price: 34000, originalPrice: 39000, imageKey: 'deskSetup', description: 'Giấy note Post-it chuẩn 76x76mm, keo dính vừa phải giúp bóc dán nhiều lần mà không làm rách giấy.', specifications: { 'Kích thước': '76x76mm', 'Số tờ': '100 tờ/xấp', 'Màu': 'Vàng chanh', 'Dòng sản phẩm': 'Post-it 654' }, stock: 260, sold: 530, rating: 4.7, reviewCount: 26, tags: ['post-it', 'giấy note', '3m'], colors: ['Vàng chanh'], createdAt: '2026-01-22T00:00:00Z', status: 'active' },
  { id: 'prod-010', name: 'Sổ lò xo FlexOffice A4 120 trang', sku: 'FO-SP-A4-120', categoryId: 'cat-paper', brandId: 'brand-flexoffice', price: 42000, originalPrice: 48000, imageKey: 'plannerNotebook', description: 'Sổ lò xo A4 phù hợp ghi biên bản họp, bảng công việc hoặc theo dõi học tập với khổ giấy rộng.', specifications: { 'Kích thước': 'A4', 'Số trang': '120', 'Kiểu đóng gáy': 'Lò xo đôi', 'Ruột giấy': 'Kẻ ngang' }, stock: 175, sold: 302, rating: 4.4, reviewCount: 17, tags: ['sổ lò xo', 'flexoffice', 'a4'], colors: ['Xanh', 'Đen'], createdAt: '2026-01-24T00:00:00Z', status: 'active' },

  { id: 'prod-011', name: 'Kẹp bướm Deli 19mm hộp 12 cái', sku: 'DL-BC-19-12', categoryId: 'cat-fastener', brandId: 'brand-deli', price: 18000, originalPrice: 22000, imageKey: 'binderClips', description: 'Kẹp bướm 19mm giúp gom tài liệu gọn gàng, lực kẹp tốt cho xấp giấy mỏng và vừa.', specifications: { 'Loại': 'Kẹp bướm', 'Kích thước': '19mm', 'Quy cách': '12 cái/hộp', 'Màu': 'Đen' }, stock: 240, sold: 390, rating: 4.5, reviewCount: 13, tags: ['kẹp bướm', 'deli'], colors: ['Đen'], wholesalePrice: [{ minQty: 20, price: 16000 }, { minQty: 100, price: 14500 }], createdAt: '2026-01-26T00:00:00Z', status: 'active' },
  { id: 'prod-012', name: 'Kẹp giấy tam giác 28mm hộp 100 cái', sku: 'OEM-PC-28-100', categoryId: 'cat-fastener', brandId: 'brand-plus', price: 14000, originalPrice: 17000, imageKey: 'binderClips', description: 'Kẹp giấy trơn phủ kim loại chống gỉ cơ bản, thích hợp ghim chứng từ mỏng dưới 30 tờ.', specifications: { 'Loại': 'Kẹp giấy', 'Kích thước': '28mm', 'Quy cách': '100 cái/hộp', 'Chất liệu': 'Thép mạ' }, stock: 320, sold: 460, rating: 4.3, reviewCount: 11, tags: ['kẹp giấy', '28mm'], colors: ['Bạc'], createdAt: '2026-01-28T00:00:00Z', status: 'active' },
  { id: 'prod-013', name: 'Ghim bấm số 10 PLUS hộp 1.000 kim', sku: 'PL-10-1000', categoryId: 'cat-fastener', brandId: 'brand-plus', price: 12000, originalPrice: 15000, imageKey: 'stapler', description: 'Ghim số 10 dùng cho máy bấm mini, chân ghim đều giúp hạn chế kẹt ghim khi bấm.', specifications: { 'Cỡ ghim': 'No.10', 'Quy cách': '1.000 kim/hộp', 'Vật liệu': 'Thép mạ', 'Ứng dụng': 'Máy bấm mini số 10' }, stock: 410, sold: 620, rating: 4.5, reviewCount: 24, tags: ['ghim bấm', 'plus', 'số 10'], createdAt: '2026-01-30T00:00:00Z', status: 'active' },
  { id: 'prod-014', name: 'Kim bấm Deli 23/13 hộp 1.000 kim', sku: 'DL-2313-1000', categoryId: 'cat-fastener', brandId: 'brand-deli', price: 23000, originalPrice: 27000, imageKey: 'stapler', description: 'Kim bấm 23/13 phù hợp máy bấm đại, dùng để đóng xấp tài liệu dày trong văn phòng.', specifications: { 'Cỡ ghim': '23/13', 'Quy cách': '1.000 kim/hộp', 'Độ dày tài liệu': '70-100 tờ', 'Vật liệu': 'Thép mạ kẽm' }, stock: 190, sold: 275, rating: 4.4, reviewCount: 9, tags: ['kim bấm', '23/13', 'deli'], createdAt: '2026-02-01T00:00:00Z', status: 'active' },
  { id: 'prod-015', name: 'Máy bấm kim mini PLUS ST-010E', sku: 'PL-ST010E', categoryId: 'cat-fastener', brandId: 'brand-plus', price: 85000, originalPrice: 99000, imageKey: 'stapler', description: 'Máy bấm kim mini thân kim loại bọc nhựa, dùng ghim số 10, phù hợp bấm tài liệu dưới 20 tờ.', specifications: { 'Loại ghim tương thích': 'No.10', 'Sức chứa ghim': '50 kim', 'Khả năng bấm': '15-20 tờ', 'Chất liệu': 'Kim loại + nhựa' }, stock: 95, sold: 188, rating: 4.6, reviewCount: 12, tags: ['máy bấm kim', 'plus'], colors: ['Đen', 'Xanh dương'], createdAt: '2026-02-03T00:00:00Z', status: 'active' },

  { id: 'prod-016', name: 'Bìa lá A4 PLUS trong suốt 0.18mm', sku: 'PL-CF-A4-018', categoryId: 'cat-file', brandId: 'brand-plus', price: 3000, originalPrice: 4000, imageKey: 'ringBinder', description: 'Bìa lá trong A4 dày 0.18mm giúp bảo vệ tài liệu đơn lẻ khỏi bụi và gập mép.', specifications: { 'Khổ giấy': 'A4', 'Độ dày': '0.18mm', 'Chất liệu': 'PP trong suốt', 'Công dụng': 'Bảo quản tài liệu đơn' }, stock: 800, sold: 1300, rating: 4.2, reviewCount: 28, tags: ['bìa lá', 'a4', 'plus'], colors: ['Trong suốt'], wholesalePrice: [{ minQty: 100, price: 2600 }, { minQty: 500, price: 2200 }], createdAt: '2026-02-05T00:00:00Z', status: 'active' },
  { id: 'prod-017', name: 'Túi hồ sơ nút bấm A4 Thiên Long', sku: 'TL-PP-A4-BTN', categoryId: 'cat-file', brandId: 'brand-thienlong', price: 14000, originalPrice: 18000, imageKey: 'archiveBinders', description: 'Túi hồ sơ nhựa PP có nút bấm, đựng vừa tài liệu A4 và chống văng giấy khi di chuyển.', specifications: { 'Khổ giấy': 'A4', 'Chất liệu': 'PP', 'Kiểu đóng': 'Nút bấm', 'Màu': 'Trong mờ' }, stock: 280, sold: 468, rating: 4.4, reviewCount: 16, tags: ['túi hồ sơ', 'thiên long'], colors: ['Trong mờ', 'Xanh'], createdAt: '2026-02-07T00:00:00Z', status: 'active' },
  { id: 'prod-018', name: 'File còng 2 inch Deli A4', sku: 'DL-RB-2IN-A4', categoryId: 'cat-file', brandId: 'brand-deli', price: 82000, originalPrice: 95000, imageKey: 'archiveBinders', description: 'File còng Deli gáy 2 inch thích hợp lưu hợp đồng, chứng từ kế toán theo từng bộ dày.', specifications: { 'Khổ giấy': 'A4', 'Kích thước gáy': '2 inch', 'Loại còng': '2 còng', 'Bìa ngoài': 'Giấy bồi phủ PP' }, stock: 110, sold: 224, rating: 4.6, reviewCount: 15, tags: ['file còng', 'deli', 'a4'], colors: ['Xanh dương', 'Đen'], createdAt: '2026-02-09T00:00:00Z', status: 'active' },
  { id: 'prod-019', name: 'Bìa trình ký Deli A4', sku: 'DL-CLIP-A4', categoryId: 'cat-file', brandId: 'brand-deli', price: 48000, originalPrice: 55000, imageKey: 'ringBinder', description: 'Bìa trình ký cứng mặt kẹp chắc, dùng để ký văn bản, checklist kho hoặc kiểm kê hiện trường.', specifications: { 'Khổ giấy': 'A4', 'Chất liệu': 'Bìa cứng bọc nhựa', 'Phụ kiện': 'Kẹp inox', 'Màu': 'Đen' }, stock: 135, sold: 178, rating: 4.3, reviewCount: 10, tags: ['trình ký', 'deli'], colors: ['Đen'], createdAt: '2026-02-11T00:00:00Z', status: 'active' },
  { id: 'prod-020', name: 'Hộp tài liệu nhựa Deli gáy 10cm', sku: 'DL-BOX-10CM', categoryId: 'cat-file', brandId: 'brand-deli', price: 115000, originalPrice: 132000, imageKey: 'archiveBinders', description: 'Hộp tài liệu nhựa cứng gáy 10cm dùng lưu tài liệu nội bộ, hồ sơ dự án hoặc chứng từ lưu kho.', specifications: { 'Chất liệu': 'Nhựa PP cứng', 'Bề rộng gáy': '10cm', 'Khổ chứa': 'A4', 'Tay cầm': 'Có' }, stock: 78, sold: 121, rating: 4.5, reviewCount: 8, tags: ['hộp tài liệu', 'deli'], colors: ['Xanh dương', 'Đen'], createdAt: '2026-02-13T00:00:00Z', status: 'active' },

  { id: 'prod-021', name: 'Băng keo trong 3M 24mm x 66Y', sku: '3M-CT-24-66', categoryId: 'cat-adhesive', brandId: 'brand-3m', price: 19000, originalPrice: 24000, imageKey: 'tapeDispenser', description: 'Băng keo trong độ bám ổn định, phù hợp dán thùng, niêm phong tài liệu và đóng gói cơ bản.', specifications: { 'Bề rộng': '24mm', 'Chiều dài': '66Y', 'Màu': 'Trong suốt', 'Loại keo': 'Acrylic' }, stock: 520, sold: 760, rating: 4.6, reviewCount: 20, tags: ['băng keo trong', '3m'], wholesalePrice: [{ minQty: 20, price: 17500 }, { minQty: 100, price: 16000 }], createdAt: '2026-02-15T00:00:00Z', status: 'active' },
  { id: 'prod-022', name: 'Keo khô Deli 21g', sku: 'DL-GLUE-21', categoryId: 'cat-adhesive', brandId: 'brand-deli', price: 12000, originalPrice: 15000, imageKey: 'stationeryFlatlay', description: 'Keo khô dạng thỏi 21g, lên keo vừa phải, ít lem giấy và dễ thao tác cho học sinh lẫn văn phòng.', specifications: { 'Loại keo': 'Keo khô', 'Khối lượng': '21g', 'Màu keo': 'Trắng đục', 'Ứng dụng': 'Giấy, bìa mỏng' }, stock: 250, sold: 344, rating: 4.4, reviewCount: 14, tags: ['keo khô', 'deli'], createdAt: '2026-02-17T00:00:00Z', status: 'active' },
  { id: 'prod-023', name: 'Hồ nước Thiên Long G-08 35ml', sku: 'TL-G08-35', categoryId: 'cat-adhesive', brandId: 'brand-thienlong', price: 9000, originalPrice: 11000, imageKey: 'stationeryFlatlay', description: 'Hồ nước đầu lăn giúp dán đều mép giấy, tiện dùng cho phong bì, nhãn nội bộ và tài liệu hành chính.', specifications: { 'Loại keo': 'Hồ nước', 'Dung tích': '35ml', 'Đầu bôi': 'Đầu lăn', 'Bề mặt phù hợp': 'Giấy, phong bì' }, stock: 310, sold: 402, rating: 4.3, reviewCount: 12, tags: ['hồ nước', 'thiên long'], createdAt: '2026-02-19T00:00:00Z', status: 'active' },
  { id: 'prod-024', name: 'Băng keo giấy 3M 24mm x 18m', sku: '3M-MASK-24-18', categoryId: 'cat-adhesive', brandId: 'brand-3m', price: 26000, originalPrice: 32000, imageKey: 'tapeDispenser', description: 'Băng keo giấy dùng để ghi chú, phân khu, cố định tạm thời hoặc masking khi đóng gói thủ công.', specifications: { 'Bề rộng': '24mm', 'Chiều dài': '18m', 'Màu': 'Kem nhạt', 'Đặc tính': 'Dễ xé tay' }, stock: 180, sold: 214, rating: 4.5, reviewCount: 9, tags: ['băng keo giấy', '3m'], createdAt: '2026-02-21T00:00:00Z', status: 'active' },
  { id: 'prod-025', name: 'Băng keo hai mặt 3M 12mm x 10m', sku: '3M-DT-12-10', categoryId: 'cat-adhesive', brandId: 'brand-3m', price: 28000, originalPrice: 34000, imageKey: 'tapeDispenser', description: 'Băng keo hai mặt mỏng, dùng cho công việc dán poster, bảng tên mica hoặc phụ kiện bàn làm việc.', specifications: { 'Bề rộng': '12mm', 'Chiều dài': '10m', 'Loại': 'Hai mặt', 'Bề mặt phù hợp': 'Giấy, nhựa nhẹ, mica mỏng' }, stock: 165, sold: 189, rating: 4.4, reviewCount: 7, tags: ['băng keo hai mặt', '3m'], createdAt: '2026-02-23T00:00:00Z', status: 'active' },

  { id: 'prod-026', name: 'Kéo văn phòng Deli 170mm', sku: 'DL-SC-170', categoryId: 'cat-cutting', brandId: 'brand-deli', price: 42000, originalPrice: 50000, imageKey: 'deskSetup', description: 'Kéo văn phòng lưỡi thép không gỉ 170mm, cắt giấy, nylon mỏng và tem nhãn hàng ngày.', specifications: { 'Chiều dài': '170mm', 'Chất liệu lưỡi': 'Thép không gỉ', 'Tay cầm': 'Nhựa ABS', 'Ứng dụng': 'Giấy, decal mỏng' }, stock: 125, sold: 219, rating: 4.7, reviewCount: 11, tags: ['kéo', 'deli'], colors: ['Đen', 'Xanh'], createdAt: '2026-02-25T00:00:00Z', status: 'active' },
  { id: 'prod-027', name: 'Dao rọc giấy lớn Deli E2053', sku: 'DL-CUT-E2053', categoryId: 'cat-cutting', brandId: 'brand-deli', price: 22000, originalPrice: 26000, imageKey: 'deskSetup', description: 'Dao rọc giấy thân nhựa cứng, lưỡi 18mm, phù hợp mở thùng và cắt decal khổ vừa.', specifications: { 'Loại lưỡi': '18mm', 'Khóa lưỡi': 'Trượt', 'Chất liệu thân': 'Nhựa ABS', 'Ứng dụng': 'Giấy carton mỏng, decal' }, stock: 210, sold: 305, rating: 4.5, reviewCount: 16, tags: ['dao rọc giấy', 'deli'], createdAt: '2026-02-27T00:00:00Z', status: 'active' },
  { id: 'prod-028', name: 'Thước nhựa Thiên Long 30cm', sku: 'TL-RULER-30', categoryId: 'cat-cutting', brandId: 'brand-thienlong', price: 9000, originalPrice: 12000, imageKey: 'stationeryFlatlay', description: 'Thước nhựa trong 30cm in vạch rõ, phù hợp đo bản in, cắt giấy và gạch đầu dòng.', specifications: { 'Chiều dài': '30cm', 'Chất liệu': 'Nhựa PS', 'Màu': 'Trong suốt', 'Chia vạch': 'mm/cm' }, stock: 380, sold: 590, rating: 4.2, reviewCount: 18, tags: ['thước', 'thiên long', '30cm'], colors: ['Trong suốt'], createdAt: '2026-03-01T00:00:00Z', status: 'active' },
  { id: 'prod-029', name: 'Thước kẻ nhôm Deli 30cm', sku: 'DL-ALR-30', categoryId: 'cat-cutting', brandId: 'brand-deli', price: 32000, originalPrice: 39000, imageKey: 'calculatorDesk', description: 'Thước nhôm 30cm cứng cáp, cạnh thẳng phù hợp cho cắt thủ công bằng dao và đo chính xác hơn.', specifications: { 'Chiều dài': '30cm', 'Chất liệu': 'Nhôm', 'Chia vạch': 'mm/cm', 'Đặc điểm': 'Cạnh thẳng cứng' }, stock: 115, sold: 146, rating: 4.4, reviewCount: 6, tags: ['thước nhôm', 'deli'], createdAt: '2026-03-03T00:00:00Z', status: 'active' },
  { id: 'prod-030', name: 'Bộ compa Thiên Long C-01', sku: 'TL-COMPA-C01', categoryId: 'cat-cutting', brandId: 'brand-thienlong', price: 27000, originalPrice: 33000, imageKey: 'stationeryFlatlay', description: 'Bộ compa học sinh gồm compa chì cơ bản và ngòi thay, đủ dùng cho bài vẽ hình tròn phổ thông.', specifications: { 'Loại': 'Compa chì', 'Phụ kiện': 'Ngòi chì thay', 'Vỏ đựng': 'Nhựa', 'Đối tượng': 'Học sinh, văn phòng cơ bản' }, stock: 95, sold: 102, rating: 4.1, reviewCount: 4, tags: ['compa', 'thiên long'], createdAt: '2026-03-05T00:00:00Z', status: 'active' },

  { id: 'prod-031', name: 'Máy tính Casio MX-12B', sku: 'CAS-MX12B', categoryId: 'cat-calculator', brandId: 'brand-casio', price: 215000, originalPrice: 249000, imageKey: 'calculatorDesk', description: 'Máy tính bàn 12 số của Casio, phím lớn, phù hợp kế toán nội bộ, bán hàng và nhập liệu văn phòng.', specifications: { 'Số chữ số': '12 số', 'Nguồn điện': 'Pin + năng lượng mặt trời', 'Loại màn hình': 'Nghiêng', 'Phím chức năng': 'GT, MU, TAX' }, stock: 84, sold: 176, rating: 4.8, reviewCount: 21, tags: ['casio', 'máy tính bàn'], isFlashSale: true, flashSalePrice: 199000, flashSaleEnd: FLASH_SALE_END, createdAt: '2026-03-07T00:00:00Z', status: 'active' },
  { id: 'prod-032', name: 'Máy tính Casio DJ-120D Plus', sku: 'CAS-DJ120D', categoryId: 'cat-calculator', brandId: 'brand-casio', price: 395000, originalPrice: 445000, imageKey: 'calculatorDesk', description: 'Máy tính Casio dòng DJ với màn hình lớn, phím TAX tiện tính giá bán và VAT trong môi trường doanh nghiệp.', specifications: { 'Số chữ số': '12 số', 'Nguồn điện': 'Pin + năng lượng mặt trời', 'Chức năng': 'TAX, CHECK, RECHECK', 'Kiểu máy': 'Máy tính bàn cỡ lớn' }, stock: 52, sold: 113, rating: 4.7, reviewCount: 12, tags: ['casio', 'kế toán', 'tax'], createdAt: '2026-03-09T00:00:00Z', status: 'active' },
  { id: 'prod-033', name: 'Máy đục 2 lỗ Deli 0111', sku: 'DL-PUNCH-0111', categoryId: 'cat-calculator', brandId: 'brand-deli', price: 128000, originalPrice: 149000, imageKey: 'ringBinder', description: 'Máy đục 2 lỗ thân kim loại, dùng đóng hồ sơ vào file còng tiêu chuẩn với độ chính xác ổn định.', specifications: { 'Số lỗ': '2 lỗ', 'Khả năng đục': '20 tờ', 'Chất liệu': 'Kim loại', 'Khoảng cách lỗ': '80mm chuẩn file còng' }, stock: 76, sold: 122, rating: 4.5, reviewCount: 8, tags: ['máy đục lỗ', 'deli'], createdAt: '2026-03-11T00:00:00Z', status: 'active' },
  { id: 'prod-034', name: 'Máy bấm kim đại PLUS HD-10D', sku: 'PL-HD10D', categoryId: 'cat-calculator', brandId: 'brand-plus', price: 145000, originalPrice: 168000, imageKey: 'stapler', description: 'Máy bấm kim thân kim loại chắc tay, dùng ghim số 10 hoặc ghim văn phòng tương thích cho xấp giấy vừa.', specifications: { 'Khả năng bấm': '25 tờ', 'Loại ghim': 'No.10', 'Chất liệu': 'Kim loại', 'Màu': 'Đen' }, stock: 61, sold: 97, rating: 4.6, reviewCount: 7, tags: ['bấm kim đại', 'plus'], createdAt: '2026-03-13T00:00:00Z', status: 'active' },
  { id: 'prod-035', name: 'Con dấu số tự động Deli 8 số', sku: 'DL-NUM-8DIG', categoryId: 'cat-calculator', brandId: 'brand-deli', price: 162000, originalPrice: 189000, imageKey: 'deskOrganizer', description: 'Con dấu số tự động 8 số giúp đóng số chứng từ, phiếu xuất kho hoặc mã hồ sơ nhanh và đều.', specifications: { 'Số ký tự': '8 số', 'Loại mực': 'Mực dầu thay thế', 'Cơ chế': 'Tự động', 'Ứng dụng': 'Đóng số chứng từ' }, stock: 28, sold: 44, rating: 4.3, reviewCount: 3, tags: ['con dấu số', 'deli'], createdAt: '2026-03-15T00:00:00Z', status: 'active' },

  { id: 'prod-036', name: 'Khay tài liệu 3 tầng Deli', sku: 'DL-TRAY-3T', categoryId: 'cat-desk', brandId: 'brand-deli', price: 285000, originalPrice: 329000, imageKey: 'deskOrganizer', description: 'Khay tài liệu 3 tầng giúp phân loại giấy tờ đến, đi và hồ sơ chờ xử lý trên bàn làm việc.', specifications: { 'Số tầng': '3 tầng', 'Chất liệu': 'Nhựa ABS', 'Khổ chứa': 'A4', 'Kiểu lắp ráp': 'Lắp ghép' }, stock: 47, sold: 88, rating: 4.6, reviewCount: 9, tags: ['khay tài liệu', 'deli', 'bàn làm việc'], isCustomizable: false, createdAt: '2026-03-17T00:00:00Z', status: 'active' },
  { id: 'prod-037', name: 'Cốc đựng bút gỗ tre để bàn', sku: 'OEM-BAMBOO-PEN', categoryId: 'cat-desk', brandId: 'brand-flexoffice', price: 79000, originalPrice: 95000, imageKey: 'deskOrganizer', description: 'Cốc đựng bút bằng tre ép phủ dầu nhẹ, phù hợp bàn làm việc tối giản và góc tiếp khách nhỏ.', specifications: { 'Chất liệu': 'Tre ép', 'Kích thước': '8 x 8 x 10 cm', 'Kiểu hoàn thiện': 'Sơn dầu mờ', 'Ngăn chứa': '1 ngăn chính' }, stock: 52, sold: 67, rating: 4.4, reviewCount: 5, tags: ['cốc bút', 'tre', 'eco'], isCustomizable: true, customizationOptions: ['Khắc tên', 'Khắc logo'], wholesalePrice: [{ minQty: 20, price: 72000 }, { minQty: 50, price: 68000 }], createdAt: '2026-03-19T00:00:00Z', status: 'active' },
  { id: 'prod-038', name: 'Ống cắm bút lưới kim loại Deli', sku: 'DL-MESH-PEN', categoryId: 'cat-desk', brandId: 'brand-deli', price: 58000, originalPrice: 68000, imageKey: 'deskOrganizer', description: 'Ống cắm bút lưới kim loại sơn tĩnh điện, bền và dễ vệ sinh, hợp bàn làm việc văn phòng hiện đại.', specifications: { 'Chất liệu': 'Lưới kim loại', 'Hoàn thiện': 'Sơn tĩnh điện', 'Màu': 'Đen', 'Kích thước': '9 x 9 x 10 cm' }, stock: 93, sold: 141, rating: 4.7, reviewCount: 10, tags: ['ống cắm bút', 'deli'], colors: ['Đen'], createdAt: '2026-03-21T00:00:00Z', status: 'active' },
  { id: 'prod-039', name: 'Bảng note acrylic để bàn A5', sku: 'OEM-ACRYLIC-A5', categoryId: 'cat-desk', brandId: 'brand-plus', price: 98000, originalPrice: 118000, imageKey: 'deskSetup', description: 'Bảng note acrylic khổ A5 giúp ghi thông báo ngắn, quote hoặc hướng dẫn đặt trên quầy lễ tân.', specifications: { 'Kích thước': 'A5', 'Chất liệu': 'Acrylic trong', 'Độ dày': '3mm', 'Kiểu sử dụng': 'Để bàn' }, stock: 38, sold: 55, rating: 4.3, reviewCount: 4, tags: ['bảng note', 'acrylic'], isCustomizable: true, customizationOptions: ['In logo chân đế', 'Khắc tên thương hiệu'], createdAt: '2026-03-23T00:00:00Z', status: 'active' },
  { id: 'prod-040', name: 'Lịch để bàn tối giản 2026', sku: 'OEM-DESKCAL-2026', categoryId: 'cat-desk', brandId: 'brand-flexoffice', price: 65000, originalPrice: 78000, imageKey: 'plannerNotebook', description: 'Lịch để bàn 2026 dạng dựng tam giác, đủ ngày tháng và khoảng trống ghi việc quan trọng.', specifications: { 'Năm': '2026', 'Kiểu dáng': 'Tam giác để bàn', 'Ngôn ngữ': 'Tiếng Việt', 'Chất liệu': 'Giấy couche + đế carton' }, stock: 0, sold: 126, rating: 4.2, reviewCount: 6, tags: ['lịch để bàn', '2026'], colors: ['Trắng', 'Xanh navy'], createdAt: '2026-03-25T00:00:00Z', status: 'active' },
];

const products = productSeeds.map((seed) => ({
  id: seed.id,
  name: seed.name,
  slug: slugify(seed.name),
  sku: seed.sku,
  categoryId: seed.categoryId,
  brandId: seed.brandId,
  price: seed.price,
  originalPrice: seed.originalPrice,
  discount: calcDiscount(seed.price, seed.originalPrice),
  images: makeImages(seed.imageKey, seed.name, seed.id),
  description: seed.description,
  specifications: seed.specifications,
  stock: seed.stock,
  sold: seed.sold,
  rating: seed.rating ?? 0,
  reviewCount: seed.reviewCount ?? 0,
  reviews: reviewsByProduct[seed.id] || [],
  colors: seed.colors || [],
  tags: seed.tags || [],
  isFlashSale: Boolean(seed.isFlashSale),
  flashSaleEnd: seed.isFlashSale ? seed.flashSaleEnd || FLASH_SALE_END : null,
  flashSalePrice: seed.isFlashSale ? seed.flashSalePrice : null,
  isCustomizable: Boolean(seed.isCustomizable),
  customizationOptions: seed.customizationOptions || [],
  wholesalePrice: seed.wholesalePrice || [],
  createdAt: seed.createdAt,
  status: seed.status || 'active',
}));

const categories = categorySeeds.map((category) => ({
  ...category,
  productCount: products.filter((product) => product.categoryId === category.id && product.status === 'active').length,
}));

const productLookup = Object.fromEntries(products.map((product) => [product.id, product]));

function buildOrderItem(productId, quantity, customization = null) {
  const product = productLookup[productId];
  const price = product.isFlashSale && product.flashSalePrice ? product.flashSalePrice : product.price;
  return {
    productId,
    productName: product.name,
    productImage: product.images[0]?.url || '',
    price,
    quantity,
    customization,
  };
}

const orders = [
  {
    id: 'ORD-1001',
    userId: 'user-2',
    subtotal: 271000,
    shippingFee: 30000,
    discount: 20000,
    total: 281000,
    status: 'delivered',
    paymentMethod: 'cod',
    paymentStatus: 'paid',
    shippingMethod: 'standard',
    shippingAddress: addresses[1],
    voucherCode: 'WELCOME20K',
    note: 'Giao giờ hành chính.',
    createdAt: '2026-04-16T08:30:00Z',
    returnRequest: null,
    items: [
      buildOrderItem('prod-001', 20),
      buildOrderItem('prod-006', 2),
      buildOrderItem('prod-011', 3),
    ],
    timeline: [
      { status: 'pending', date: '2026-04-16T08:30:00Z', note: null },
      { status: 'confirmed', date: '2026-04-16T08:45:00Z', note: 'Đã xác nhận đơn' },
      { status: 'processing', date: '2026-04-16T11:00:00Z', note: 'Đang đóng gói' },
      { status: 'shipping', date: '2026-04-17T09:10:00Z', note: 'Bàn giao vận chuyển' },
      { status: 'delivered', date: '2026-04-18T14:20:00Z', note: 'Đã giao thành công' },
    ],
  },
  {
    id: 'ORD-1002',
    userId: 'user-2',
    subtotal: 266000,
    shippingFee: 25000,
    discount: 0,
    total: 291000,
    status: 'shipping',
    paymentMethod: 'momo',
    paymentStatus: 'paid',
    shippingMethod: 'express',
    shippingAddress: addresses[1],
    voucherCode: null,
    note: 'Gọi trước khi giao.',
    createdAt: '2026-04-22T10:15:00Z',
    returnRequest: null,
    items: [
      buildOrderItem('prod-008', 2, { type: 'Dập tên', text: 'Phan Quang User' }),
      buildOrderItem('prod-022', 4),
      buildOrderItem('prod-026', 2),
    ],
    timeline: [
      { status: 'pending', date: '2026-04-22T10:15:00Z', note: null },
      { status: 'confirmed', date: '2026-04-22T10:40:00Z', note: null },
      { status: 'processing', date: '2026-04-22T14:00:00Z', note: 'Đang chuẩn bị hàng' },
      { status: 'shipping', date: '2026-04-23T09:00:00Z', note: 'GHN-EXP-2268' },
    ],
  },
  {
    id: 'ORD-1003',
    userId: 'user-2',
    subtotal: 425000,
    shippingFee: 30000,
    discount: 30000,
    total: 425000,
    status: 'processing',
    paymentMethod: 'banking',
    paymentStatus: 'paid',
    shippingMethod: 'standard',
    shippingAddress: addresses[1],
    voucherCode: 'FREESHIP30',
    note: 'Xuất hóa đơn điện tử.',
    createdAt: '2026-05-05T09:20:00Z',
    returnRequest: null,
    items: [
      buildOrderItem('prod-031', 1),
      buildOrderItem('prod-036', 1),
      buildOrderItem('prod-038', 2),
    ],
    timeline: [
      { status: 'pending', date: '2026-05-05T09:20:00Z', note: null },
      { status: 'confirmed', date: '2026-05-05T09:50:00Z', note: 'Thanh toán đã xác nhận' },
      { status: 'processing', date: '2026-05-05T13:30:00Z', note: 'Đang chuẩn bị hàng' },
    ],
  },
];

const chatMessages = [
  { id: 'msg-1', senderId: 'user-2', senderName: 'Phan Quang User', senderRole: 'customer', targetUserId: 'user-1', message: 'Cho mình hỏi giấy Double A có xuất hóa đơn VAT được không?', timestamp: '2026-05-08T09:00:00Z', isRead: true },
  { id: 'msg-2', senderId: 'user-1', senderName: 'Phan Quang Admin', senderRole: 'admin', targetUserId: 'user-2', message: 'Bên shop có hỗ trợ xuất hóa đơn VAT cho đơn doanh nghiệp nhé.', timestamp: '2026-05-08T09:02:00Z', isRead: true },
  { id: 'msg-3', senderId: 'user-2', senderName: 'Phan Quang User', senderRole: 'customer', targetUserId: 'user-1', message: 'Sổ tay Deli có nhận dập tên số lượng 30 cuốn không?', timestamp: '2026-05-10T14:20:00Z', isRead: false },
];

async function clearExistingData(pool) {
  await pool.request().query(`
    DELETE FROM dbo.order_timeline;
    DELETE FROM dbo.order_items;
    DELETE FROM dbo.orders;
    DELETE FROM dbo.wishlist;
    DELETE FROM dbo.reviews;
    DELETE FROM dbo.addresses;
    DELETE FROM dbo.chat_messages;
    DELETE FROM dbo.vouchers;
    DELETE FROM dbo.products;
    DELETE FROM dbo.categories;
    DELETE FROM dbo.brands;
    DELETE FROM dbo.users;
  `);
}

async function seedData(pool, sql) {
  await clearExistingData(pool);

  for (const brand of brands) {
    await pool.request()
      .input('id', sql.NVarChar, brand.id)
      .input('name', sql.NVarChar, brand.name)
      .input('logo', sql.NVarChar, brand.logo)
      .query('INSERT INTO dbo.brands (id, name, logo) VALUES (@id, @name, @logo)');
  }

  for (const category of categories) {
    await pool.request()
      .input('id', sql.NVarChar, category.id)
      .input('name', sql.NVarChar, category.name)
      .input('slug', sql.NVarChar, category.slug)
      .input('icon', sql.NVarChar, category.icon)
      .input('description', sql.NVarChar, category.description)
      .input('productCount', sql.Int, category.productCount)
      .input('image', sql.NVarChar, category.image)
      .query('INSERT INTO dbo.categories (id, name, slug, icon, description, productCount, image) VALUES (@id, @name, @slug, @icon, @description, @productCount, @image)');
  }

  for (const product of products) {
    await pool.request()
      .input('id', sql.NVarChar, product.id)
      .input('name', sql.NVarChar, product.name)
      .input('slug', sql.NVarChar, product.slug)
      .input('sku', sql.NVarChar, product.sku)
      .input('categoryId', sql.NVarChar, product.categoryId)
      .input('brandId', sql.NVarChar, product.brandId)
      .input('price', sql.Decimal(18, 2), product.price)
      .input('originalPrice', sql.Decimal(18, 2), product.originalPrice)
      .input('discount', sql.Int, product.discount)
      .input('images', sql.NVarChar(sql.MAX), JSON.stringify(product.images))
      .input('description', sql.NVarChar(sql.MAX), product.description)
      .input('specifications', sql.NVarChar(sql.MAX), JSON.stringify(product.specifications))
      .input('stock', sql.Int, product.stock)
      .input('sold', sql.Int, product.sold)
      .input('rating', sql.Decimal(3, 2), product.rating)
      .input('reviewCount', sql.Int, product.reviewCount)
      .input('reviews', sql.NVarChar(sql.MAX), JSON.stringify(product.reviews))
      .input('colors', sql.NVarChar(sql.MAX), JSON.stringify(product.colors))
      .input('tags', sql.NVarChar(sql.MAX), JSON.stringify(product.tags))
      .input('isFlashSale', sql.Bit, product.isFlashSale)
      .input('flashSaleEnd', sql.DateTime2, product.flashSaleEnd)
      .input('flashSalePrice', sql.Decimal(18, 2), product.flashSalePrice)
      .input('isCustomizable', sql.Bit, product.isCustomizable)
      .input('customizationOptions', sql.NVarChar(sql.MAX), JSON.stringify(product.customizationOptions || []))
      .input('wholesalePrice', sql.NVarChar(sql.MAX), JSON.stringify(product.wholesalePrice || []))
      .input('createdAt', sql.DateTime2, product.createdAt)
      .input('status', sql.NVarChar, product.status)
      .query(`
        INSERT INTO dbo.products (
          id, name, slug, sku, categoryId, brandId, price, originalPrice, discount, images, description,
          specifications, stock, sold, rating, reviewCount, reviews, colors, tags,
          isFlashSale, flashSaleEnd, flashSalePrice, isCustomizable, customizationOptions, wholesalePrice,
          createdAt, status
        ) VALUES (
          @id, @name, @slug, @sku, @categoryId, @brandId, @price, @originalPrice, @discount, @images, @description,
          @specifications, @stock, @sold, @rating, @reviewCount, @reviews, @colors, @tags,
          @isFlashSale, @flashSaleEnd, @flashSalePrice, @isCustomizable, @customizationOptions, @wholesalePrice,
          @createdAt, @status
        )
      `);
  }

  const defaultPasswordHash = await bcrypt.hash('123456', 10);
  for (const user of users) {
    await pool.request()
      .input('id', sql.NVarChar, user.id)
      .input('email', sql.NVarChar, user.email)
      .input('name', sql.NVarChar, user.name)
      .input('phone', sql.NVarChar, user.phone)
      .input('avatar', sql.NVarChar, user.avatar)
      .input('role', sql.NVarChar, user.role)
      .input('status', sql.NVarChar, user.status)
      .input('passwordHash', sql.NVarChar, defaultPasswordHash)
      .input('createdAt', sql.DateTime2, user.createdAt)
      .query('INSERT INTO dbo.users (id, email, name, phone, avatar, role, status, passwordHash, createdAt) VALUES (@id, @email, @name, @phone, @avatar, @role, @status, @passwordHash, @createdAt)');
  }

  for (const addr of addresses) {
    await pool.request()
      .input('id', sql.NVarChar, addr.id)
      .input('userId', sql.NVarChar, addr.userId)
      .input('name', sql.NVarChar, addr.name)
      .input('phone', sql.NVarChar, addr.phone)
      .input('street', sql.NVarChar, addr.street)
      .input('ward', sql.NVarChar, addr.ward)
      .input('district', sql.NVarChar, addr.district)
      .input('city', sql.NVarChar, addr.city)
      .input('isDefault', sql.Bit, addr.isDefault)
      .query('INSERT INTO dbo.addresses (id, userId, name, phone, street, ward, district, city, isDefault) VALUES (@id, @userId, @name, @phone, @street, @ward, @district, @city, @isDefault)');
  }

  for (const review of reviewSeeds) {
    const user = users.find((item) => item.id === review.userId);
    await pool.request()
      .input('id', sql.NVarChar, review.id)
      .input('productId', sql.NVarChar, review.productId)
      .input('userId', sql.NVarChar, review.userId)
      .input('userName', sql.NVarChar, user?.name || '')
      .input('userAvatar', sql.NVarChar, user?.avatar || '')
      .input('rating', sql.Int, review.rating)
      .input('comment', sql.NVarChar(sql.MAX), review.comment)
      .input('helpful', sql.Int, review.helpful)
      .input('isVerifiedPurchase', sql.Bit, review.isVerifiedPurchase)
      .input('createdAt', sql.DateTime2, review.createdAt)
      .query(`
        INSERT INTO dbo.reviews (id, productId, userId, userName, userAvatar, rating, comment, helpful, isVerifiedPurchase, createdAt)
        VALUES (@id, @productId, @userId, @userName, @userAvatar, @rating, @comment, @helpful, @isVerifiedPurchase, @createdAt)
      `);
  }

  for (const voucher of vouchers) {
    await pool.request()
      .input('id', sql.NVarChar, voucher.id)
      .input('code', sql.NVarChar, voucher.code)
      .input('type', sql.NVarChar, voucher.type)
      .input('value', sql.Decimal(18, 2), voucher.value)
      .input('minOrderValue', sql.Decimal(18, 2), voucher.minOrderValue)
      .input('maxDiscount', sql.Decimal(18, 2), voucher.maxDiscount)
      .input('usageLimit', sql.Int, voucher.usageLimit)
      .input('usedCount', sql.Int, voucher.usedCount)
      .input('startDate', sql.DateTime2, voucher.startDate)
      .input('endDate', sql.DateTime2, voucher.endDate)
      .input('status', sql.NVarChar, voucher.status)
      .input('description', sql.NVarChar, voucher.description)
      .query('INSERT INTO dbo.vouchers (id, code, type, value, minOrderValue, maxDiscount, usageLimit, usedCount, startDate, endDate, status, description) VALUES (@id, @code, @type, @value, @minOrderValue, @maxDiscount, @usageLimit, @usedCount, @startDate, @endDate, @status, @description)');
  }

  for (const order of orders) {
    await pool.request()
      .input('id', sql.NVarChar, order.id)
      .input('userId', sql.NVarChar, order.userId)
      .input('subtotal', sql.Decimal(18, 2), order.subtotal)
      .input('shippingFee', sql.Decimal(18, 2), order.shippingFee)
      .input('discount', sql.Decimal(18, 2), order.discount)
      .input('total', sql.Decimal(18, 2), order.total)
      .input('status', sql.NVarChar, order.status)
      .input('paymentMethod', sql.NVarChar, order.paymentMethod)
      .input('paymentStatus', sql.NVarChar, order.paymentStatus)
      .input('shippingMethod', sql.NVarChar, order.shippingMethod)
      .input('shippingAddress', sql.NVarChar(sql.MAX), JSON.stringify(order.shippingAddress))
      .input('voucherCode', sql.NVarChar, order.voucherCode)
      .input('note', sql.NVarChar(sql.MAX), order.note)
      .input('createdAt', sql.DateTime2, order.createdAt)
      .input('returnRequest', sql.NVarChar(sql.MAX), JSON.stringify(order.returnRequest))
      .query('INSERT INTO dbo.orders (id, userId, subtotal, shippingFee, discount, total, status, paymentMethod, paymentStatus, shippingMethod, shippingAddress, voucherCode, note, createdAt, returnRequest) VALUES (@id, @userId, @subtotal, @shippingFee, @discount, @total, @status, @paymentMethod, @paymentStatus, @shippingMethod, @shippingAddress, @voucherCode, @note, @createdAt, @returnRequest)');

    for (const item of order.items) {
      await pool.request()
        .input('orderId', sql.NVarChar, order.id)
        .input('productId', sql.NVarChar, item.productId)
        .input('productName', sql.NVarChar, item.productName)
        .input('productImage', sql.NVarChar, item.productImage)
        .input('price', sql.Decimal(18, 2), item.price)
        .input('quantity', sql.Int, item.quantity)
        .input('customization', sql.NVarChar(sql.MAX), JSON.stringify(item.customization))
        .query('INSERT INTO dbo.order_items (orderId, productId, productName, productImage, price, quantity, customization) VALUES (@orderId, @productId, @productName, @productImage, @price, @quantity, @customization)');
    }

    for (const entry of order.timeline) {
      await pool.request()
        .input('orderId', sql.NVarChar, order.id)
        .input('status', sql.NVarChar, entry.status)
        .input('date', sql.DateTime2, entry.date)
        .input('note', sql.NVarChar, entry.note)
        .query('INSERT INTO dbo.order_timeline (orderId, status, date, note) VALUES (@orderId, @status, @date, @note)');
    }
  }

  for (const msg of chatMessages) {
    await pool.request()
      .input('id', sql.NVarChar, msg.id)
      .input('senderId', sql.NVarChar, msg.senderId)
      .input('senderName', sql.NVarChar, msg.senderName)
      .input('senderRole', sql.NVarChar, msg.senderRole)
      .input('targetUserId', sql.NVarChar, msg.targetUserId)
      .input('message', sql.NVarChar(sql.MAX), msg.message)
      .input('timestamp', sql.DateTime2, msg.timestamp)
      .input('isRead', sql.Bit, msg.isRead)
      .query('INSERT INTO dbo.chat_messages (id, senderId, senderName, senderRole, targetUserId, message, timestamp, isRead) VALUES (@id, @senderId, @senderName, @senderRole, @targetUserId, @message, @timestamp, @isRead)');
  }
}

module.exports = { seedData };
