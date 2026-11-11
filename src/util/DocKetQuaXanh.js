// src/Util/DocKetQuaXanh.js – Chụp 1 lần, check 1 toạ độ xanh lá → true | false
"use strict";

const { PNG } = require("pngjs");
const { typeStatusBatDauToaDo } = require("../config/RoomConfig");

const NUA = 12;                   // vùng 24x24 quanh tâm
const LE = NUA + 2;               // lề vùng chụp
const DEBUG = true;               // true để in chi tiết

// Ngưỡng % pixel xanh lá tối thiểu để tính là có xanh, riêng cho từng type
const PHAN_TRAM_TOI_THIEU = {
    type_room_a: 42,
    type_room_b: 42,
};
const NGUONG_MAC_DINH = 15;       // type nào chưa khai báo ở trên thì dùng số này

function laXanhLa(r, g, b) {
    return g > 140 && g - r > 50 && g - b > 50;
}

// Trả về { xanh, tong, phanTram } quanh tâm
function demXanh(png, vung, cx, cy) {
    let xanh = 0, tong = 0;
    for (let dy = -NUA; dy < NUA; dy++) {
        for (let dx = -NUA; dx < NUA; dx++) {
            const px = Math.round(cx - vung.x + dx);
            const py = Math.round(cy - vung.y + dy);
            if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
            tong++;
            const i = (py * png.width + px) * 4;
            if (laXanhLa(png.data[i], png.data[i + 1], png.data[i + 2])) xanh++;
        }
    }
    return { xanh, tong, phanTram: tong ? (xanh / tong) * 100 : 0 };
}

/**
 * @returns {Promise<boolean>} true nếu điểm xanh có đủ % pixel xanh lá.
 */
async function DocKetQuaXanh(page, roomType) {
    const p = typeStatusBatDauToaDo[roomType].xanh;

    const vung = {
        x: Math.round(p.x - LE),
        y: Math.round(p.y - LE),
        width: 2 * LE,
        height: 2 * LE,
    };

    const buf = await page.screenshot({ clip: vung, type: "png", scale: "css" });
    const png = PNG.sync.read(buf);

    const r = demXanh(png, vung, p.x, p.y);
    const nguong = PHAN_TRAM_TOI_THIEU[roomType] ?? NGUONG_MAC_DINH;
    const ketQua = r.phanTram >= nguong;

    if (DEBUG) {
        console.log(
            "[DocKetQuaXanh]🟢", roomType,
            `| xanh=${r.xanh}/${r.tong}px (${r.phanTram.toFixed(1)}%) | ngưỡng=${nguong}% → ${ketQua}`
        );
    }

    return ketQua;
}

module.exports = { DocKetQuaXanh };