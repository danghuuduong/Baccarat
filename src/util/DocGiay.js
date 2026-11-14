// src/Util/DocGiay.js – Kiểm tra 8 ô số giây: có chữ trắng và không có màu đỏ → đạt
// Làm giống DocBi: toạ độ là TÂM ô, tính các ô khác bằng công thức, đếm pixel quanh tâm
"use strict";

const { PNG } = require("pngjs");
// A: tâm ô số giây của phòng 1
// Điểm 2: tâm ô số giây của phòng 2
// Điểm 3: tâm ô số giây của phòng 3
// ── Số đo (đo bằng chuột phải, là tâm ô số) ─────────────────────────────────
// Điền 3 điểm đo (tâm ô số giây), chép nguyên văn x, y
const D1 = { x: 138, y: 92 };      // phòng 1
const D2 = { x: 584.5, y: 92 };      // phòng 2 (chỉ dùng x)
const D3 = { x: 138, y: 253.1 };   // phòng 3 (chỉ dùng y)

const COT_BAN = 2, HANG_BAN = 4;

const A = { x: D1.x, y: D1.y };
const BUOC_BAN_X = D2.x - D1.x;
const BUOC_BAN_Y = D3.y - D1.y;

const NUA_X = 5, NUA_Y = 4;              // nửa kích thước vùng đếm quanh tâm (vùng 8×10)
const TRANG_MIN = 5;                     // ít nhất bấy nhiêu pixel trắng (nét chữ) mới đạt

// ── Vùng chụp bao cả 8 ô số (chụp 1 lần) ────────────────────────────────────
const LE = 3;
const VUNG = {
    x: Math.round(A.x - NUA_X - LE),
    y: Math.round(A.y - NUA_Y - LE),
    width: Math.round((COT_BAN - 1) * BUOC_BAN_X + 2 * NUA_X + 2 * LE),
    height: Math.round((HANG_BAN - 1) * BUOC_BAN_Y + 2 * NUA_Y + 2 * LE),
};

const laTrang = (r, g, b) => r > 200 && g > 200 && b > 200;
const laDo = (r, g, b) => r > 170 && g < 110 && b < 110;

// ── Đọc 1 ô số quanh tâm (cx, cy): có đỏ → false, đủ pixel trắng → true ─────
function docO(png, cx, cy) {
    let trang = 0;

    for (let dy = -NUA_Y; dy < NUA_Y; dy++) {
        for (let dx = -NUA_X; dx < NUA_X; dx++) {
            const px = Math.round(cx - VUNG.x + dx);
            const py = Math.round(cy - VUNG.y + dy);
            if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;

            const i = (py * png.width + px) * 4;
            const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];

            if (laDo(r, g, b)) return false;   // có đỏ là tạch luôn
            if (laTrang(r, g, b)) trang++;
        }
    }
    return trang >= TRANG_MIN;
}

/**
 * Chụp 1 lần, trả mảng 8 phần tử boolean theo thứ tự phòng 1..8 (hàng ngang rồi xuống hàng):
 *   true  = có chữ trắng và không có đỏ (đạt)
 *   false = có đỏ, hoặc không thấy chữ trắng
 */
async function docGiay(page) {
    const buf = await page.screenshot({ clip: VUNG, type: "png", scale: "css" });
    const png = PNG.sync.read(buf);

    const kq = [];
    for (let j = 0; j < HANG_BAN; j++) {
        for (let i = 0; i < COT_BAN; i++) {
            kq.push(docO(png, A.x + i * BUOC_BAN_X, A.y + j * BUOC_BAN_Y));
        }
    }
    return kq;
}

module.exports = { docGiay, VUNG };