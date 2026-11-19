"use strict";

const DO_DAI_XANH = 2;

// Hoà (T/H/...) bị bỏ qua: chỉ giữ B và P
// BPTP => BPP | PTP => PP | BPPTB => BPPB
function LayTinHieu(arr) {
    if (!Array.isArray(arr)) return false;
    const a = arr.filter(x => x === "B" || x === "P");
    const n = a.length;
    if (n < DO_DAI_XANH) return false;
    for (let i = n - DO_DAI_XANH; i < n; i++) {
        if (a[i] !== "P") return false;
    }
    return a[n - DO_DAI_XANH - 1] !== "P";
}

module.exports = { LayTinHieu };