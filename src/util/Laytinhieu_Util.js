const DO_DAI_DO = 2;

function LayTinHieu(arr) {
    if (!Array.isArray(arr)) return false;
    const a = arr.filter(x => x === "B" || x === "P");
    const n = a.length;
    if (n < DO_DAI_DO) return false;

    // 2 con cuối phải là P
    for (let i = n - DO_DAI_DO; i < n; i++) {
        if (a[i] !== "P") return false;
    }

    // Con liền trước phải khác P (hoặc không có con nào trước)
    return n === DO_DAI_DO || a[n - DO_DAI_DO - 1] !== "P";
}

module.exports = { LayTinHieu };