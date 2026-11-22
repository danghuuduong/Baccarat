const DO_DAI_DO = 2;
const DO_DAI_COT_TRUOC = 3;

function LayTinHieu(arr) {
    if (!Array.isArray(arr)) return false;
    const a = arr.filter(x => x === "B" || x === "P");
    const n = a.length;
    if (n < DO_DAI_DO) return false;

    // 2 con cuối phải là P, con liền trước phải khác P
    for (let i = n - DO_DAI_DO; i < n; i++) {
        if (a[i] !== "P") return false;
    }
    if (a[n - DO_DAI_DO - 1] === "P") return false;

    // Phía trước 2 con chờ phải có ít nhất 1 cột xanh >= 3 (ở đâu cũng được)
    let dem = 0;
    for (let i = n - DO_DAI_DO - 1; i >= 0; i--) {
        if (a[i] === "P") {
            dem++;
            if (dem >= DO_DAI_COT_TRUOC) return true;
        } else {
            dem = 0;
        }
    }
    return false;
}

module.exports = { LayTinHieu };