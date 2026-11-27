"use strict";

const TIE = "T";

// Đổi tên kết quả sang màu tín hiệu
const MAU = {
    P: "blue",
    B: "red",
    T: "green",
};

// Bệt cuối mảng (bỏ qua Tie): 4 con → thep 1, 5 con → thep 2, 6-7 con → thep 3.
// Ngoài khoảng 4-7 thì trả null.
function LayTinHieu(arr) {
    if (!Array.isArray(arr)) return null;

    let mau = null;
    let dai = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
        const x = arr[i];
        if (x === TIE) continue;
        if (mau === null) { mau = x; dai = 1; }
        else if (x === mau) dai++;
        else break;
    }

    if (!MAU[mau]) return null;

    if (!MAU[mau] || dai !== 3) return null;

    return { tinhieu: MAU[mau === "P" ? "B" : "P"] };
}

module.exports = { LayTinHieu };