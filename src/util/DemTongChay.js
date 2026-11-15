function DemTongChay(arr) {
    if (!Array.isArray(arr) || arr.length < 7) return 0;

    const cols = [];
    for (let i = 0; i < arr.length; i += 6) cols.push(arr.slice(i, i + 6));

    let chuoi = 0;

    for (let k = 1; k < cols.length; k++) {
        const cotChuan = cols[k - 1];

        for (let cy = 0; cy < 2; cy++) {
            const tinHieu = cotChuan[cy === 0 ? 1 : 4];
            const cacO = cols[k].slice(cy * 3, cy * 3 + 3);

            if (cacO.length < 3) continue;
            if (tinHieu === TIE) continue;
            if (cacO.includes(tinHieu)) continue;

            if (cacO.some((x) => x !== TIE)) chuoi++;
        }
    }

    return chuoi;
}

module.exports = { DemTongChay };