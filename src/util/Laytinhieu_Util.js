"use strict";

const TIE = "T";

// Đổi tên kết quả sang màu tín hiệu
const MAU = {
    P: "blue",
    B: "red",
    T: "green",
};

// Trả về { tinhieu: "blue" | "red" | "green", thep: 1 | 2 | 3 } cho ô kế tiếp, không có tín hiệu thì trả null.
// Mảng đọc theo cột, mỗi cột 6 ô. Ô kế tiếp sẽ ra nằm ở vị trí arr.length:
//   - Thuộc chu kỳ 1 (hàng 1-3) thì lấy màu ô 2 của cột đầy liền trước
//   - Thuộc chu kỳ 2 (hàng 4-6) thì lấy màu ô 5 của cột đầy liền trước
//   - thep = thứ tự của ô trong chu kỳ: hàng 1/4 → 1, hàng 2/5 → 2, hàng 3/6 → 3
function LayTinHieu(arr) {
    // Cần ít nhất cột 1 đủ 6 ô để có cột chuẩn
    if (!Array.isArray(arr) || arr.length < 6) return null;
    while (arr.length >= 24) arr = arr.slice(6);   // ← thêm: đủ 24 ô thì bỏ cột đầu (6 ô), lặp tới khi < 24

    const pos = arr.length;              // vị trí ô kế tiếp
    const k = Math.floor(pos / 6);       // cột chứa ô kế tiếp (tính từ 0)
    if (k >= 4) return null;             // bảng đã đủ 24 ô, không còn cột

    const cy = (pos % 6) < 3 ? 0 : 1;    // 0 = chu kỳ 1, 1 = chu kỳ 2
    const cotChuan = arr.slice((k - 1) * 6, k * 6); // cột đầy liền trước
    const tinHieu = cotChuan[cy === 0 ? 1 : 4];     // ô 2 hoặc ô 5

    if (tinHieu === TIE) return null;    // tín hiệu là Tie thì bỏ qua chu kỳ

    // Các ô đã ra trong chu kỳ này, có ô trùng màu tín hiệu rồi thì thôi
    const daRa = arr.slice(k * 6 + cy * 3, pos);
    if (daRa.includes(tinHieu)) return null;

    const tinhieu = MAU[tinHieu];
    if (!tinhieu) return null;           // dữ liệu lạ

    const thep = (pos % 3) + 1;          // hàng 1/4 → 1, 2/5 → 2, 3/6 → 3
    return { tinhieu, thep };
}

module.exports = { LayTinHieu };