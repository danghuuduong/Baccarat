"use strict";

const { getKetQuaListTable } = require("../State/ketQuaListState");

const TIE = "KetQua_Tie";
const SO_CHUOI_DAT = 2;   // ngầm >= SO_CHUOI_DAT → đủ điều kiện đánh thật
const NGUONG_UU_TIEN = 1; // ngầm >= NGUONG_UU_TIEN → lưu vào danh sách ưu tiên

// Hàm nội bộ: tính số ngầm thực tế từ mảng kết quả.
// Mảng đọc theo cột, mỗi cột 6 ô. Mỗi cột có 2 chu kỳ:
//   - Chu kỳ 1 (ô 1-3) theo màu ô 2 của cột trước
//   - Chu kỳ 2 (ô 4-6) theo màu ô 5 của cột trước
function _tinhSoNgam(arr) {
    if (!Array.isArray(arr) || arr.length < 7) return 0;

    const cols = [];
    for (let i = 0; i < arr.length; i += 6) cols.push(arr.slice(i, i + 6));

    let chuoi = 0;

    for (let k = 1; k < cols.length; k++) {
        const cotChuan = cols[k - 1];

        for (let cy = 0; cy < 2; cy++) {
            const tinHieu = cotChuan[cy === 0 ? 1 : 4];
            const cacO = cols[k].slice(cy * 3, cy * 3 + 3);

            if (cacO.length === 0) continue;
            if (tinHieu === TIE) continue;

            if (cacO.includes(tinHieu)) {
                chuoi = 0;
                continue;
            }

            if (cacO.length < 3) continue;

            const oKhacTie = cacO.filter((x) => x !== TIE);
            if (oKhacTie.length === 0) continue;

            chuoi++;
        }
    }

    return chuoi;
}

// Trả về số ngầm thực tế (integer >= 0).
function GetSoNgam(arr = getKetQuaListTable()) {
    const so = _tinhSoNgam(arr);
    console.log(`ℹ️ [GetSoNgam] ngầm = ${so}`);
    return so;
}

// Trả về true nếu chuỗi cháy ngầm hiện tại >= SO_CHUOI_DAT, ngược lại false.
function CheckChay2Ngam(arr = getKetQuaListTable()) {
    const so = _tinhSoNgam(arr);
    console.log(`⚠️ [CheckChay2Ngam] ngầm = ${so} → ${so >= SO_CHUOI_DAT}`);
    return so >= SO_CHUOI_DAT;
}

module.exports = { CheckChay2Ngam, GetSoNgam, SO_CHUOI_DAT, NGUONG_UU_TIEN };