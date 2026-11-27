"use strict";

const TIE = "T";

// Gom mảng thành các cột bệt (bỏ qua Tie)
function GomCotBet(arr) {
    const cols = [];
    for (const x of arr) {
        if (x === TIE) continue;
        const last = cols[cols.length - 1];
        if (last && last.mau === x) last.dai++;
        else cols.push({ mau: x, dai: 1 });
    }
    return cols;
}

function CheckChay2Ngam(arr) {
    if (!Array.isArray(arr)) return { chuoi: 0, isDat: false };

    const cols = GomCotBet(arr);
    if (cols.length === 0) return { chuoi: 0, isDat: false };

    const chuoi = cols[cols.length - 1].dai;
    return { chuoi, isDat: chuoi === 5, uutien: 0 };
}

module.exports = { CheckChay2Ngam, GomCotBet };