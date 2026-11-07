// src/util/ChuyenPhong.js – Thoát phòng hiện tại, xác nhận về sảnh
"use strict";

const { checkOnce } = require("./checker");
const { showThongBao } = require("../UI/UI_ThongBao");
const { captureItems, IMAGES_DIR } = require("../captureState");
const { TOA_DO_THOAT_PHONG } = require("../config/RoomConfig");

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Click thoát phòng, chờ xác nhận đã về sảnh (ảnh NgoaiSanhCho).
 * @param {import('playwright').Page} page
 * @param {string} [thongBao] - Nội dung thông báo hiển thị khi thoát
 * @returns {Promise<false|"KHONG_TIM_THAY_SANH">}
 *   false = về sảnh thành công | "KHONG_TIM_THAY_SANH" = không tìm thấy sảnh
 */
async function ChuyenPhong(page, thongBao = "⚠️") {
    showThongBao(page, thongBao, 5000);
    await new Promise(r => setTimeout(r, 200));

    // Click nút thoát phòng
    await page.mouse.click(TOA_DO_THOAT_PHONG.x, TOA_DO_THOAT_PHONG.y);
    await new Promise(r => setTimeout(r, 300));

    // Lấy toạ độ ảnh NgoaiSanhCho
    let info = null;
    try {
        info = await page.evaluate(async () => {
            if (typeof window.getImageInfo === "function")
                return await window.getImageInfo("NgoaiSanhCho");
            return null;
        });
    } catch (_) { }

    if (!info) {
        const found = captureItems.find(it => it.name === "NgoaiSanhCho");
        info = found
            ? { x: found.x, y: found.y, width: found.width, height: found.height }
            : { x: 288, y: 258, width: 100, height: 25 };
    }

    // Chờ tối đa 10s cho đến khi thấy ảnh sảnh
    const startTime = Date.now();
    while (Date.now() - startTime < 7000) {
        try {
            const res = await checkOnce(page, IMAGES_DIR, info.x, info.y, info.width, info.height);
            if (res && res.name === "NgoaiSanhCho") return false; // ✅ về sảnh thành công
        } catch (_) { }
        await new Promise(r => setTimeout(r, 1000));
    }
    return "KHONG_TIM_THAY_SANH";
}

module.exports = { ChuyenPhong };

