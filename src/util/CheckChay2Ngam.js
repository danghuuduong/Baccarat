"use strict";

// Cột xanh từ cuối về đầu: cot[0] là cột gần nhất. Hòa (T) bỏ qua, đỏ (B) ngắt cột.
function LayCotXanh(arr) {
    const cot = [];
    let dem = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] === "P") dem++;
        else if (arr[i] === "B" && dem > 0) { cot.push(dem); dem = 0; }
    }
    if (dem > 0) cot.push(dem);
    return cot;
}

// Có đoạn ">=3, (một hoặc nhiều cột =2), >=3" bắt đầu tại vị trí i không.
// loc[0] là cột sát nhất, đã bỏ cột 1 con.
function doanTai(loc, i) {
    if (!(loc[i] >= 3)) return false;
    let j = i + 1;
    let soHai = 0;
    while (j < loc.length && loc[j] === 2) { soHai++; j++; }
    return soHai >= 1 && j < loc.length && loc[j] >= 3;
}

// Đếm số đoạn ở bất kỳ vị trí nào (2 đoạn có thể dính nhau).
function demDoan(loc) {
    let doan = 0;
    for (let i = 0; i < loc.length; i++) {
        if (doanTai(loc, i)) doan++;
    }
    return doan;
}

// Trả { isOk, uutien }. Bỏ cột xanh 1 con rồi mới xét.
// Đoạn đầu tiên phải bắt đầu từ cột sát nhất (loc[0]).
//  >= 2 đoạn -> uutien 1
//  1 đoạn    -> uutien 0
function CheckXanh3(arr) {
    if (!Array.isArray(arr)) return { isOk: false, uutien: 0 };
    const loc = LayCotXanh(arr).filter((n) => n >= 2);

    if (!doanTai(loc, 0)) return { isOk: false, uutien: 0 };

    return { isOk: true, uutien: demDoan(loc) >= 2 ? 1 : 0 };
}

module.exports = { CheckXanh3 };