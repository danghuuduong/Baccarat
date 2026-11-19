// src/Util/DocLuoi.js – Chụp 1 lần, đọc 1 lưới bi (cột x hàng) → mảng "B" | "P" | "T"
"use strict";

const { PNG } = require("pngjs");

const NUA = 5;                           // đếm vùng 10×10 quanh tâm viên bi
const TI_LE_TOI_THIEU = 0.25;            // màu chiếm >= 25% vùng thì tính
const LE = 10;                           // lề quanh vùng chụp

// ── Phân loại 1 pixel ────────────────────────────────────────────────────────
function loaiPixel(r, g, b) {
    if (r > 170 && g < 100 && b < 100) return "B";                 // đỏ
    if (b > 150 && r < 90 && b > g + 40) return "P";               // xanh dương
    if (g > 100 && r < 100 && b < 100 && g > r + 40) return "T";   // xanh lá
    return null;
}

// ── Đếm màu trong vùng quanh tâm (cx, cy) ────────────────────────────────────
function docVien(png, vung, cx, cy) {
    const dem = { B: 0, P: 0, T: 0 };
    let tong = 0;

    for (let dy = -NUA; dy < NUA; dy++) {
        for (let dx = -NUA; dx < NUA; dx++) {
            const px = Math.round(cx - vung.x + dx);
            const py = Math.round(cy - vung.y + dy);
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

/**
 * @param {import('playwright').Page} page
 * @param {{ goc1: {x:number,y:number}, goc2: {x:number,y:number}, cot: number, hang: number }} cfg
 *        goc1 = tâm bi cột 1 hàng 1, goc2 = tâm bi cột cuối hàng cuối
 * @returns {Promise<string[]>} mảng "B"|"P"|"T", đọc từng cột trái → phải, trong cột trên → dưới.
 *          Gặp ô trống thì dừng. Viên cuối mảng là mới nhất.
 */
async function DocLuoiTable(page, { goc1, goc2, cot, hang }) {
    const buocX = cot > 1 ? (goc2.x - goc1.x) / (cot - 1) : 0;
    const buocY = hang > 1 ? (goc2.y - goc1.y) / (hang - 1) : 0;

    const vung = {
        x: Math.round(goc1.x - LE),
        y: Math.round(goc1.y - LE),
        width: Math.round((cot - 1) * buocX + 2 * LE),
        height: Math.round((hang - 1) * buocY + 2 * LE),
    };

    const buf = await page.screenshot({ clip: vung, type: "png", scale: "css" });
    const png = PNG.sync.read(buf);

    const kq = [];

    ngoai:
    for (let c = 0; c < cot; c++) {
        for (let r = 0; r < hang; r++) {
            const mau = docVien(png, vung, goc1.x + c * buocX, goc1.y + r * buocY);
            if (!mau) break ngoai;   // gặp ô trống là hết
            kq.push(mau);
        }
    }
    return kq;
}

module.exports = { DocLuoiTable };