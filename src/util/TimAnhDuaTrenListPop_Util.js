// src/util/waitForRoomType_Util.js – Chờ nhận ra loại phòng trong danh sách tên truyền vào
"use strict";

const { checkOnce } = require("./checker");
const { captureItems, IMAGES_DIR } = require("../captureState");

/**
 * Bounding box bao phủ tất cả item trong captureItems có tên nằm trong danhSachTen.
 * Trả null nếu không tìm thấy item nào.
 */
function getTypeRoomRegion(danhSachTen) {
    const items = captureItems.filter(it => danhSachTen.includes(it.name));
    if (items.length === 0) return null;

    const x1 = Math.min(...items.map(it => it.x));
    const y1 = Math.min(...items.map(it => it.y));
    const x2 = Math.max(...items.map(it => it.x + it.width));
    const y2 = Math.max(...items.map(it => it.y + it.height));

    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/**
 * Cứ 0.3s check 1 lần trong tối đa timeoutMs.
 * Trả về tên (nằm trong danhSachTen) nếu tìm thấy, null nếu hết giờ.
 * @param {import('playwright').Page} page
 * @param {string[]} danhSachTen
 * @param {number} timeoutMs
 */
async function TimAnhDuaTrenListPop_Util(page, danhSachTen, timeoutMs = 5000) {
    const INTERVAL = 300;
    const start = Date.now();

    const region = getTypeRoomRegion(danhSachTen);
    if (!region) return null;

    while (Date.now() - start < timeoutMs) {
        const result = await checkOnce(
            page,
            IMAGES_DIR,
            region.x,
            region.y,
            region.width,
            region.height
        );

        if (result.name && danhSachTen.includes(result.name)) {
            return result.name;
        }

        await new Promise(r => setTimeout(r, INTERVAL));
    }

    return null;
}

module.exports = { TimAnhDuaTrenListPop_Util };