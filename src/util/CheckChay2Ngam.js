

"use strict";

const setting = require("../State/setting");


const BANKER = "B"; // đỏ  → "d"
const PLAYER = "P"; // xanh → "x"
const DEP = "Đẹp";
const XAU = "Xấu";

// Tìm 2 3 ngầm ở cuối

const SO_LIEN_TIEP = 3;

// Tìm 2 3 ngầm ở cuối  . nhưng mà phải đếm đống  đó xem có hơn không nữa. ví dụ tìm được 2 xấu . => đẹp  nhưng xấu phải hơn 2


// ============================================================================
// CHỈ NHẬN DẠNG CẦU 2-2 (và 2-2 plus), đếm xấu/đẹp theo từng ván.
// [tên, mẫu, chu kỳ lặp, màu ván kế được tính ĐẸP, số con đầu được thiếu khi mới bắt đầu chuỗi, g]
//  - mẫu: a = màu con đầu, b = màu kia
//  - chu kỳ lặp: cửa sổ lùi 1 chu kỳ cũng khớp thì là chuỗi đang lặp, bỏ qua (chỉ chấm lúc hình thành)
//  - g = true: con ngay trước cửa sổ phải khác màu con đầu
// ============================================================================
const CAU = [
    ["2-2", "abaabb", 0, "a", 2],
    // ["2-2 plus", "abbaab", 2, "b"],
];

const doiMau = (c) => (c === "d" ? "x" : "d");

// Bỏ Hòa và dữ liệu lạ, đổi sang chuỗi d/x
function layChuoi(arr) {
    const s = [];
    for (const n of arr) {
        if (n === BANKER) s.push("d");
        else if (n === PLAYER) s.push("x");
    }
    return s;
}

// Cửa sổ mẫu t kết thúc tại end. Trả về màu 'a' nếu khớp, không thì null.
// m = số con đầu của mẫu được phép thiếu khi mới bắt đầu chuỗi
function khop(s, end, t, m = 1, g = false) {
    const st = end - t.length;
    if (st < -m) return null;
    const j0 = st < 0 ? -st : 0;
    const c = s[st + j0];
    const a = t[j0] === "a" ? c : doiMau(c);
    const b = doiMau(a);
    if (g && st > 0 && s[st - 1] === a) return null;
    for (let j = j0; j < t.length; j++) {
        if (s[st + j] !== (t[j] === "a" ? a : b)) return null;
    }
    return a;
}

// Rà từ đầu mảng, trả về danh sách kết quả theo thứ tự thời gian: ["Đẹp", "Xấu", ...]
function layArrayXauDep(s) {
    const out = [];

    for (let i = 1; i < s.length; i++) {
        for (const [, t, P, dep, m = 1, g = false] of CAU) {
            const a = khop(s, i, t, m, g);
            if (!a) continue;
            if (P && khop(s, i - P, t, m, g)) continue; // chuỗi đang lặp thì bỏ qua
            const mauDep = dep === "a" ? a : doiMau(a);
            out.push(s[i] === mauDep ? DEP : XAU);
        }
    }
    return out;
}

function xuLyXauDep(arrayXauDep) {
    const n = arrayXauDep.length;

    if (n === 1) {
        return { isDat: true, phe: arrayXauDep[0] };
    }

    if (n >= 2) {
        const [a, b] = arrayXauDep.slice(-2);
        if (a !== b) {
            return { isDat: true, phe: b };
        }
    }

    return { isDat: false, phe: null };
}

function CheckChay2Ngam(arr) {
    if (!Array.isArray(arr)) {
        return { isDat: false, phe: null, chuoiLienTiep: 0, benUuThe: null, chenhLech: 0 };
    }

    const arrayXauDep = layArrayXauDep(layChuoi(arr));
    const kq = xuLyXauDep(arrayXauDep);

    const n = arrayXauDep.length;
    const cuoi = arrayXauDep[n - 1];
    let chuoiCuoi = 0;
    while (chuoiCuoi < n && arrayXauDep[n - 1 - chuoiCuoi] === cuoi) chuoiCuoi++;
    const soXau = arrayXauDep.filter((x) => x === XAU).length;
    const soDep = n - soXau;

    const benUuThe = soDep === soXau ? null : soDep > soXau ? DEP : XAU;
    const chenhLech = Math.abs(soDep - soXau);
    return {
        isDat: kq.isDat,
        phe: kq.phe,
        chuoiLienTiep: chuoiCuoi,
        benUuThe,
        chenhLech,
        soDep,
        soXau,
    };
}

module.exports = { CheckChay2Ngam };
