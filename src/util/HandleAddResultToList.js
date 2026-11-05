// src/util/themKetQua.js
"use strict";

const ketQuaListState = require('../State/ketQuaListState');

// Thêm kết quả: dữ liệu do state lo, UI cập nhật ở đây vì cần page
async function HandleAddResultToList(page, ketQua) {
    const list = ketQuaListState.pushKetQuaListTable(ketQua);
    try {
        await page.evaluate((l) => {
            if (typeof window.updateUI_KetQuaList === "function") window.updateUI_KetQuaList(l);
        }, list);
    } catch (err) {
        console.error("❌ Cập nhật UI lỗi:", err.message);
    }
}

// Xoá toàn bộ kết quả: đồng bộ cả state Node.js lẫn giao diện browser UI
async function HandleClearKetQuaList(page) {
    ketQuaListState.clearKetQuaListTable();
    try {
        if (page && !page.isClosed()) {
            await page.evaluate(() => {
                if (typeof window.clearUI_KetQuaList === "function") {
                    window.clearUI_KetQuaList();
                } else if (typeof window.updateUI_KetQuaList === "function") {
                    window.updateUI_KetQuaList([]);
                }
            });
        }
    } catch (err) {
        console.error("❌ Xoá UI kết quả lỗi:", err.message);
    }
}

module.exports = { HandleAddResultToList, HandleClearKetQuaList };
