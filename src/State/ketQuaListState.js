// src/ketQuaState.js – Quản lý mảng kết quả bàn Baccarat (KetQuaListTable)
"use strict";

let KetQuaListTable = [];

const MAX_KETQUA = 23;      // tối đa 24 item  - > đủ 4 cột xoá bớt đi 1 cột
const SO_XOA_KHI_DAY = 6;   // đầy (item thứ 25) thì xoá 6 item đầu

module.exports = {
    getKetQuaListTable() {
        return KetQuaListTable;
    },

    setKetQuaListTable(list) {
        KetQuaListTable = Array.isArray(list) ? list.slice() : [];
        return KetQuaListTable;
    },

    // Thêm 1 kết quả vào cuối. Item thứ 25 thì xoá 6 item đầu.
    // Trả về bản copy của list mới để đưa lên UI.
    pushKetQuaListTable(ketQua) {
        KetQuaListTable.push(ketQua);
        if (KetQuaListTable.length > MAX_KETQUA) {
            KetQuaListTable.splice(0, SO_XOA_KHI_DAY);
        }
        return KetQuaListTable.slice();
    },

    clearKetQuaListTable() {
        KetQuaListTable = [];
        return KetQuaListTable;
    }
};