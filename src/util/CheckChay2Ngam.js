"use strict";

// Độ dài tối thiểu của cột xanh gần nhất (đổi qua 4 ở đây)
const DO_DAI_XANH = 4;

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
// Giữa 2 đầu >=3 chỉ được toàn cột =2 (có cột >2 chen vào thì không tính), phải có ít nhất 1 cột =2.
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

// Trả { isOk, uutien }. Ưu tiên 1 và 2 bỏ cột xanh 1 con (không tính) rồi mới xét:
//  uutien 2: 2 đoạn liên tiếp (>=3, 2.., >=3, 2.., >=3) (cao nhất)
//  uutien 1: 1 đoạn (>=3, 2.., >=3)
//  uutien 0: cột xanh gần nhất >= DO_DAI_XANH (xét trên cột gốc, không bỏ cột 1 con)
function CheckXanh3(arr) {
    if (!Array.isArray(arr)) return { isOk: false, uutien: 0 };
    const cot = LayCotXanh(arr);
    const loc = cot.filter((n) => n >= 2);

    const doan = demDoan(loc);
    if (doan >= 2) return { isOk: true, uutien: 1 };
    // if (doan === 1) return { isOk: true, uutien: 1 };
    if (cot.length >= 1 && cot[0] >= DO_DAI_XANH) {
        return { isOk: true, uutien: 0 };
    }
    return { isOk: false, uutien: 0 };
}

module.exports = { CheckXanh3 };