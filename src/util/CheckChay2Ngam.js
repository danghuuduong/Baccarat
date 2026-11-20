"use strict";

// Độ dài tối thiểu của cột xanh gần nhất (đã hạ từ 4 xuống 3)
const DO_DAI_XANH = 3;

// Cột từ 3 con trở lên = lần đánh trước đã ăn (2 con chờ + 1 con thắng)
const DO_DAI_DA_AN = 3;

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

// Đếm số đoạn ">=3, (một hoặc nhiều cột =2), >=3" nối tiếp nhau, tính từ cột gần nhất.
// Giữa 2 đầu >=3 chỉ được toàn cột =2, phải có ít nhất 1 cột =2.
// loc = các cột xanh gần nhất trước, đã bỏ cột 1 con.
function demDoan(loc) {
    if (!(loc[0] >= 3)) return 0;
    let doan = 0;
    let i = 0;
    while (true) {
        let j = i + 1;
        let soHai = 0;
        while (j < loc.length && loc[j] === 2) { soHai++; j++; }
        if (soHai >= 1 && j < loc.length && loc[j] >= 3) { doan++; i = j; }
        else break;
    }
    return doan;
}

// Trả { isOk, uutien }. Bỏ cột xanh 1 con rồi mới xét.
//  A = cột gần nhất (phải >= DO_DAI_XANH), B = cột liền trước A.
//  B >= 3 -> lần trước đã ăn rồi -> không vào.
//  B = 2 hoặc không có B -> được vào:
//    uutien 1: có >= 1 đoạn (>=3, 2.., >=3)
//    uutien 0: còn lại
function CheckXanh3(arr) {
    if (!Array.isArray(arr)) return { isOk: false, uutien: 0 };
    const cot = LayCotXanh(arr);
    const loc = cot.filter((n) => n >= 2);

    const A = loc[0];
    const B = loc[1];

    if (!(A >= DO_DAI_XANH)) return { isOk: false, uutien: 0 };
    if (B >= DO_DAI_DA_AN) return { isOk: false, uutien: 0 };

    if (demDoan(loc) >= 1) return { isOk: true, uutien: 1 };
    return { isOk: true, uutien: 0 };
}

module.exports = { CheckXanh3 };