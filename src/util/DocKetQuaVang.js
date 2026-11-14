// src/Util/DocKetQuaVang.js – Chụp 1 lần, check 3 toạ độ LED vàng → "B" | "P" | "T" | null
"use strict";

const { PNG } = require("pngjs");
const { typeKetQuaToaDo } = require("../config/RoomConfig");

const NUA = 4;                    // 4 vùng 8x8 quanh tâm
const LE = NUA + 2;               // lề vùng chụp
const DEBUG = true;               // true để in chi tiết từng điểm

// Ngưỡng % pixel vàng tối thiểu để tính là sáng, riêng cho từng type
const PHAN_TRAM_TOI_THIEU = {
    type_room_a: 32,
    type_room_b: 15,
};
const NGUONG_MAC_DINH = 15;       // type nào chưa khai báo ở trên thì dùng số này

function laVang(r, g, b) {
    return r > 180 && g > 140 && b < 140 && r - b > 90 && g - b > 50;
}

// Trả về { vang, tong, phanTram } quanh tâm
function demVang(png, vung, cx, cy) {
    let vang = 0, tong = 0;
    for (let dy = -NUA; dy < NUA; dy++) {
        for (let dx = -NUA; dx < NUA; dx++) {
            const px = Math.round(cx - vung.x + dx);
            const py = Math.round(cy - vung.y + dy);
            if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
            tong++;
            const i = (py * png.width + px) * 4;
            if (laVang(png.data[i], png.data[i + 1], png.data[i + 2])) vang++;
        }
    }
    return { vang, tong, phanTram: tong ? (vang / tong) * 100 : 0 };
}

/**
 * @returns {Promise<"B"|"P"|"T"|null>} red=B, blue=P, green=T. Không bên nào vàng thì null.
 */
async function DocKetQuaVang(page, roomType) {
    const td = typeKetQuaToaDo[roomType];
    const diem = [["B", td.red], ["P", td.blue], ["T", td.green]];

    const xs = diem.map(([, p]) => p.x), ys = diem.map(([, p]) => p.y);
    const vung = {
        x: Math.round(Math.min(...xs) - LE),
        y: Math.round(Math.min(...ys) - LE),
        width: Math.round(Math.max(...xs) - Math.min(...xs) + 2 * LE),
        height: Math.round(Math.max(...ys) - Math.min(...ys) + 2 * LE),
    };

    const buf = await page.screenshot({ clip: vung, type: "png", scale: "css" });
    const png = PNG.sync.read(buf);

    // Lấy điểm có % pixel vàng cao nhất
    let best = null, max = 0;
    const log = [];
    for (const [ten, p] of diem) {
        const r = demVang(png, vung, p.x, p.y);
        log.push(`${ten}=${r.vang}/${r.tong}px (${r.phanTram.toFixed(1)}%)`);
        if (r.phanTram > max) { max = r.phanTram; best = ten; }
    }

    const nguong = PHAN_TRAM_TOI_THIEU[roomType] ?? NGUONG_MAC_DINH;
    const ketQua = max >= nguong ? best : null;

    if (DEBUG) {
        console.clear();
        console.log(
            "[DocKetQuaVang]😍", roomType, "|", log.join(" | "),
            `| ngưỡng=${nguong}% | cao nhất=${best} ${max.toFixed(1)}% → ${ketQua}`
        );
    }

    return ketQua;
}

module.exports = { DocKetQuaVang };