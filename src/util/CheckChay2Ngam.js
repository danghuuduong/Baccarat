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

// Trả { isOk, uutien }
//  uutien 2: 5 cột xanh gần nhất là >=3, =2, >=3, =2, >=3 (cao nhất)
//  uutien 1: 3 cột xanh gần nhất là >=3, =2, >=3
//  uutien 0: cột xanh gần nhất >= DO_DAI_XANH
function CheckXanh3(arr) {
    if (!Array.isArray(arr)) return { isOk: false, uutien: 0 };
    const cot = LayCotXanh(arr);

    if (cot.length >= 5
        && cot[0] >= 3 && cot[1] === 2 && cot[2] >= 3 && cot[3] === 2 && cot[4] >= 3) {
        return { isOk: true, uutien: 2 };
    }
    if (cot.length >= 3 && cot[0] >= 3 && cot[1] === 2 && cot[2] >= 3) {
        return { isOk: true, uutien: 1 };
    }
    if (cot.length >= 1 && cot[0] >= DO_DAI_XANH) {
        return { isOk: true, uutien: 0 };
    }
    return { isOk: false, uutien: 0 };
}

module.exports = { CheckXanh3 };