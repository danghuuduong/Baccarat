// src/Util/DocBi.js – Chụp 1 lần, đọc 8 bàn → mảng 8 phần tử, mỗi phần tử là mảng "B" | "P" | "T"
"use strict";

const { PNG } = require("pngjs");

const D1 = { x: 133, y: 113 };   // Ô 1: viên (cột 1 - hàng 1)
const D2 = { x: 234, y: 113 };   // Ô 1: viên (cột 7 - hàng 1)  → chỉ dùng x
const D3 = { x: 133, y: 196 };   // Ô 1: viên (cột 1 - hàng 6)  → chỉ dùng y
const D4 = { x: 579, y: 113 };   // Ô 2 (cột 2, hàng 1): viên (cột 1 - hàng 1) → chỉ dùng x
const D5 = { x: 133, y: 274 };   // Ô 3 (cột 1, hàng 2): viên (cột 1 - hàng 1) → chỉ dùng y

// Cấu trúc lưới (ít khi đổi)
const COT_BAN = 2, HANG_BAN = 4;     // 8 ô to: 2 cột × 4 hàng
const COT_BI = 7, HANG_BI = 6;       // mỗi ô to: 7 cột × 6 hàng bi

// ── Tự tính, không cần đụng ──────────────────────────────────────────────────
const A = { x: D1.x, y: D1.y };
const BUOC_BI_X = (D2.x - D1.x) / (COT_BI - 1);
const BUOC_BI_Y = (D3.y - D1.y) / (HANG_BI - 1);
const BUOC_BAN_X = D4.x - D1.x;
const BUOC_BAN_Y = D5.y - D1.y;

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

// ── Vẽ khung kiểm tra lên web đang chạy (chỉ để nhìn, test xong thì xoá) ─────
async function hienKhung(page) {
    await page.evaluate((cfg) => {
        const cu = document.getElementById("khung-kiem-tra");
        if (cu) cu.remove();

        const goc = document.createElement("div");
        goc.id = "khung-kiem-tra";
        goc.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;";

        const ve = (x, y, w, h, mau) => {
            const d = document.createElement("div");
            d.style.cssText =
                `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;` +
                `border:1px solid ${mau};box-sizing:border-box;`;
            goc.appendChild(d);
        };

        for (let j = 0; j < cfg.HANG_BAN; j++) {
            for (let i = 0; i < cfg.COT_BAN; i++) {
                const ox = cfg.A.x + i * cfg.BUOC_BAN_X;
                const oy = cfg.A.y + j * cfg.BUOC_BAN_Y;

                // Khung xanh lá: bao cả lưới bi của ô chữ nhật này
                ve(
                    ox - cfg.NUA,
                    oy - cfg.NUA,
                    (cfg.COT_BI - 1) * cfg.BUOC_BI_X + 2 * cfg.NUA,
                    (cfg.HANG_BI - 1) * cfg.BUOC_BI_Y + 2 * cfg.NUA,
                    "lime"
                );

                // Khung đỏ: vùng lấy màu quanh tâm từng viên bi
                for (let c = 0; c < cfg.COT_BI; c++) {
                    for (let r = 0; r < cfg.HANG_BI; r++) {
                        ve(
                            ox + c * cfg.BUOC_BI_X - cfg.NUA,
                            oy + r * cfg.BUOC_BI_Y - cfg.NUA,
                            2 * cfg.NUA,
                            2 * cfg.NUA,
                            "red"
                        );
                    }
                }
            }
        }
        document.body.appendChild(goc);
    }, { A, BUOC_BI_X, BUOC_BI_Y, BUOC_BAN_X, BUOC_BAN_Y, COT_BAN, HANG_BAN, COT_BI, HANG_BI, NUA });
}

async function xoaKhung(page) {
    await page.evaluate(() => {
        const d = document.getElementById("khung-kiem-tra");
        if (d) d.remove();
    });
}

module.exports = { docBan, VUNG, hienKhung, xoaKhung };