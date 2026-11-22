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

// Đếm số đoạn ">=3, (một hoặc nhiều cột =2), >=3" ở bất kỳ vị trí nào.
// Đoạn chỉ hợp lệ khi cột ngay sau cột cuối của đoạn không phải >=3.
// 2 đoạn có thể dính nhau (dùng chung cột >=3 ở giữa).
// loc = các cột xanh gần nhất trước, đã bỏ cột 1 con.
function demDoan(loc) {
    let doan = 0;
    for (let i = 0; i < loc.length; i++) {
        if (!(loc[i] >= 3)) continue;
        let j = i + 1;
        let soHai = 0;
        while (j < loc.length && loc[j] === 2) { soHai++; j++; }
        if (soHai < 1 || j >= loc.length || !(loc[j] >= 3)) continue;
        if (j + 1 < loc.length && loc[j + 1] >= 3) continue;
        doan++;
    }
    return doan;
}

// Trả { isOk, uutien }. Bỏ cột xanh 1 con rồi mới xét.
//  >= 2 đoạn -> uutien 1
//  1 đoạn    -> uutien 0
//  0 đoạn    -> không vào
function CheckXanh3(arr) {
    if (!Array.isArray(arr)) return { isOk: false, uutien: 0 };
    const loc = LayCotXanh(arr).filter((n) => n >= 2);

    const doan = demDoan(loc);
    if (doan >= 2) return { isOk: true, uutien: 1 };
    if (doan === 1) return { isOk: true, uutien: 0 };
    return { isOk: false, uutien: 0 };
}

module.exports = { CheckXanh3 };