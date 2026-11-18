"use strict";

// Độ dài đúng của cột xanh gần nhất để trả true (đổi ở đây)
const DO_DAI_XANH = 2;

// Đi từ cuối mảng về đầu: bỏ qua đỏ cho tới khi gặp xanh, đếm liên tiếp xanh, gặp đỏ thì dừng.
// Hòa (T) bỏ qua. Cột xanh gần nhất dài đúng DO_DAI_XANH thì true, còn lại false.
// BPP => true | PPP => false | PPBPP => true
function LayTinHieu(arr) {
    if (!Array.isArray(arr)) return false;
    let dem = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] === "P") dem++;
        else if (arr[i] === "B" && dem > 0) break;
    }
    return dem === DO_DAI_XANH;
}

module.exports = { LayTinHieu };