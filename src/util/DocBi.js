// src/Util/DocBi.js – Chụp 1 lần, đọc 8 bàn → mảng 8 phần tử, mỗi phần tử là mảng "B" | "P" | "T"
"use strict";

const { PNG } = require("pngjs");

// ── Số đo (từ 4 điểm A, Z, D, E) ─────────────────────────────────────────────
const A = { x: 133, y: 113 };
const BUOC_BI_X = (234 - 133) / 6;   // ≈ 16.83
const BUOC_BI_Y = (196 - 113) / 5;   // ≈ 16.6
const BUOC_BAN_X = 579 - 133;        // 446
const BUOC_BAN_Y = 274 - 113;        // 161      // 189      khoảng cách giữa 2 ô to (dọc)

const COT_BAN = 2, HANG_BAN = 4;         // 8 ô to: 2 cột × 4 hàng
const COT_BI = 7, HANG_BI = 6;           // mỗi ô to: lưới bi 7 cột × 6 hàng

const NUA = 5;                           // đếm vùng 12×12 quanh tâm viên bi
const TI_LE_TOI_THIEU = 0.25;            // màu chiếm >= 25% vùng thì tính

// ── Vùng chụp bao cả 8 ô to (chụp 1 lần) ────────────────────────────────────
const LE = 10;
const VUNG = {
    x: Math.round(A.x - LE),
    y: Math.round(A.y - LE),
    width: Math.round((COT_BAN - 1) * BUOC_BAN_X + (COT_BI - 1) * BUOC_BI_X + 2 * LE),
    height: Math.round((HANG_BAN - 1) * BUOC_BAN_Y + (HANG_BI - 1) * BUOC_BI_Y + 2 * LE),
};

// ── Phân loại 1 pixel ────────────────────────────────────────────────────────
// Chỉnh số ở đây nếu nhận sai màu
function loaiPixel(r, g, b) {
    if (r > 170 && g < 100 && b < 100) return "B";                 // đỏ
    if (b > 150 && r < 90 && b > g + 40) return "P";               // xanh dương
    if (g > 100 && r < 100 && b < 100 && g > r + 40) return "T";   // xanh lá
    return null;
}

// ── Đếm màu trong vùng quanh tâm (cx, cy) ────────────────────────────────────
function docVien(png, cx, cy) {
    const dem = { B: 0, P: 0, T: 0 };
    let tong = 0;

    for (let dy = -NUA; dy < NUA; dy++) {
        for (let dx = -NUA; dx < NUA; dx++) {
            const px = Math.round(cx - VUNG.x + dx);
            const py = Math.round(cy - VUNG.y + dy);
            if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
            const i = (py * png.width + px) * 4;
            const l = loaiPixel(png.data[i], png.data[i + 1], png.data[i + 2]);
            if (l) dem[l]++;
            tong++;
        }
    }

    let best = null, max = 0;
    for (const k of ["B", "P", "T"]) {
        if (dem[k] > max) { max = dem[k]; best = k; }
    }
    return best && max >= tong * TI_LE_TOI_THIEU ? best : null;
}

// ── Chụp 1 lần → 8 mảng ─────────────────────────────────────────────────────
/**
 * @returns {Promise<string[][]>} 8 phần tử (QC01, QC02, QC03, ... theo hàng ngang rồi xuống hàng)
 *          mỗi phần tử là mảng "B"|"P"|"T", đọc theo cột trái → phải, trong cột trên → dưới.
 *          Viên cuối mảng là ván mới nhất.
 */
async function docBan(page) {
    const buf = await page.screenshot({ clip: VUNG, type: "png", scale: "css" });
    const png = PNG.sync.read(buf);

    const kq = [];
    for (let j = 0; j < HANG_BAN; j++) {
        for (let i = 0; i < COT_BAN; i++) {
            const ox = A.x + i * BUOC_BAN_X;
            const oy = A.y + j * BUOC_BAN_Y;
            const ban = [];

            ngoai:
            for (let c = 0; c < COT_BI; c++) {
                for (let r = 0; r < HANG_BI; r++) {
                    const mau = docVien(png, ox + c * BUOC_BI_X, oy + r * BUOC_BI_Y);
                    if (!mau) break ngoai;   // gặp ô trống là hết
                    ban.push(mau);
                }
            }
            kq.push(ban);
        }
    }
    return kq;
}

module.exports = { docBan, VUNG };