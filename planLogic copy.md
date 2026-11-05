===== PLAN LOGIC ỨNG DỤNG BACCARAT Phức tạp =====

**1. Dữ liệu chung**

* `KetQua_Player` = xanh dương (P), `KetQua_Banker` = đỏ (B), `KetQua_Tie` = xanh lá (T).
* Mảng phẳng đọc theo cột từ trên xuống, mỗi cột 6 ô, tối đa 4 cột. Ô trống không có trong mảng.
  * Ví dụ: `["P","B","B","T","P","B", "P","P"]` thì cột 1 = `P B B T P B` (đủ 6 ô), cột 2 = `P P` (dở dang).
* Cột chuẩn là cột đầy (đủ 6 ô) gần nhất phía trước.
  * Ví dụ: cột 1 đủ, cột 2 dở dang thì cột chuẩn là cột 1. Cột 1 và 2 đủ, cột 3 trống thì cột chuẩn là cột 2.
* Mỗi cột chia 2 chu kỳ:
  * Chu kỳ 1 (ô 1-3) theo màu ô 2 của cột chuẩn.
  * Chu kỳ 2 (ô 4-6) theo màu ô 5 của cột chuẩn.
  * Ví dụ: cột chuẩn = `B P B B B P` thì ô 2 = P, ô 5 = B. Chu kỳ 1 của cột kế tiếp xét theo P, chu kỳ 2 xét theo B.
* Nếu ô 2 hoặc ô 5 của cột chuẩn là Tie thì bỏ qua chu kỳ tương ứng. Cả hai là Tie thì không đánh.
  * Ví dụ: ô 2 = T, ô 5 = B thì bỏ chu kỳ 1, chỉ xét chu kỳ 2 theo B.

**2. Logic 1: tìm chuỗi "cháy ngầm" ≥ 2 (chạy trước)**

* Chu kỳ **cháy** khi đủ 3 ô đã ra mà không ô nào trúng màu tín hiệu.
  * Ví dụ: tín hiệu P, chu kỳ ra `B B B` thì cháy.
* Chu kỳ có ô trúng màu tín hiệu là **ăn**, chuỗi cháy về 0.
  * Ví dụ: tín hiệu P, chu kỳ ra `B P B` thì ăn, chuỗi về 0.
* Chu kỳ mới ra 1-2 ô chưa trúng thì chưa kết luận, chưa tính cháy.
  * Ví dụ: tín hiệu P, mới ra `B B` thì chưa tính, chờ ô 3.
* Tie không tính là cháy, chỉ bỏ qua. *(cách tính chu kỳ có ô Tie xem phần chưa chốt)*
* Chuỗi tính liên tiếp, vắt qua cột, tính cả cột đang dở dang.
* Chuỗi cháy liên tiếp ≥ 2 thì đạt điều kiện.
* Ví dụ A (cột 2 cháy cả hai chu kỳ):
  * Cột 1 (chuẩn): ô 2 = P, ô 5 = B.
  * Cột 2 = `B B B P P P`. Ô 1-3 không có P nên cháy (chuỗi 1). Ô 4-6 không có B nên cháy (chuỗi 2).
  * Đạt điều kiện.
* Ví dụ B (vắt qua cột, cột 3 dở dang):
  * Cột 1 (chuẩn): ô 2 = P, ô 5 = B.
  * Cột 2 = `P B B P P P`. Ô 1-3 có P nên ăn (chuỗi về 0). Ô 4-6 không có B nên cháy (chuỗi 1).
  * Cột 2 đầy nên thành cột chuẩn mới: ô 2 = B, ô 5 = P. Cột 3 ra `P P P` (đủ 3 ô, không có B) thì cháy (chuỗi 2).
  * Đạt điều kiện.

**3. Logic 2: đánh thật**

* Đạt điều kiện thì lấy cột đầy gần nhất làm chuẩn, dùng ô 2 và ô 5 làm tín hiệu.
* Đánh chu kỳ kế tiếp theo màu tín hiệu, tiền 10k → 50k → 110k (gấp thếp).
* Thắng ở ô nào thì dừng chu kỳ. Thua thì tăng thếp. Tie thì bỏ qua và vẫn tăng thếp.
  * Ví dụ: tín hiệu P. Ô 4 ra B (thua, 10k), ô 5 ra T (bỏ qua, 50k), ô 6 ra P (thắng, 110k, dừng).
  * Ví dụ: tín hiệu P, ô 4 ra P thì thắng ngay ở 10k, dừng, không đánh ô 5, 6.
* Vào phòng muộn, ô 1 hoặc 2 đã ra mà chưa trúng thì nhảy vào đánh ô 3 của chu kỳ đó. *(xem phần chưa chốt)*
* Nếu ô đã ra mà trúng rồi thì chu kỳ đó xong, không đánh nữa.
  * Ví dụ: tín hiệu P, vào muộn thấy ô 1 đã ra P thì bỏ chu kỳ này.

**Còn 2 chỗ chưa chốt**

1. Chu kỳ có ô Tie thì tính cháy hay không? Ví dụ tín hiệu P, chu kỳ ra `B T B`:
   * **A:** Bỏ qua ô hòa, xét các ô còn lại. B và B không có P nên cháy.
   * **B:** Cả chu kỳ không tính gì, chuỗi cháy giữ nguyên.
2. Vào muộn thì vào ô kế tiếp chưa ra, hay luôn nhảy vào ô 3? Ví dụ tín hiệu P, vào phòng khi ô 4 đã ra B (chưa trúng):
   * **A:** Vào ô kế tiếp chưa ra, tức ô 5 với 50k.
   * **B:** Luôn nhảy vào ô 6 với 110k.