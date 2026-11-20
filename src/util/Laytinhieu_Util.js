const DO_DAI_DO = 3;

function LayTinHieu(arr) {
    if (!Array.isArray(arr)) return false;
    const a = arr.filter(x => x === "B" || x === "P");
    const n = a.length;
    if (n < DO_DAI_DO) return false;
    for (let i = n - DO_DAI_DO; i < n; i++) {
        if (a[i] !== "B") return false;
    }
    return a[n - DO_DAI_DO - 1] !== "B";
}

module.exports = { LayTinHieu };