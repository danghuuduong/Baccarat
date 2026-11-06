"use strict";

const { getKetQuaListTable } = require("../State/ketQuaListState");

const BANKER = "KetQua_Banker"; // đỏ  → "d"
const PLAYER = "KetQua_Player"; // xanh → "x"
const DEP = "Đẹp";
const XAU = "Xấu";

// Số kết quả giống nhau liên tiếp ở cuối để đạt (2 xấu → phe Đẹp, 2 đẹp → phe Xấu). Sửa số này khi cần.
const SO_LIEN_TIEP = 3;
const SO_LIEN_TIEP_KemChenhLech = 2;

// Chênh lệch tối thiểu giữa tổng xấu và tổng đẹp ở luật 2 và 3 (1 = chỉ cần nhiều hơn, 2 = hơn ít nhất 2, ...)
const CHENH_LECH = 2;

// ============================================================================
// DANH SÁCH CẦU (đếm xấu/đẹp theo từng ván), xử lý ở 3 chỗ trong layArrayXauDep:
//   1. 1-1, 1-1 plus   → KHÔNG nằm trong CAU, tính riêng bằng demXenKe (4 con / 5 con xen kẽ)
//   2. Mảng CAU bên dưới: 2-2, 3-3, 4-4, 2-1, 3-1, 4-1, 123 (mỗi cầu có thêm bản plus)
//   3. Khối chẵn       → chỉ chấm khi không cầu nào ở 1 và 2 khớp ở ván đó
// Muốn sửa 1 cầu: sửa đúng 1 dòng của cầu đó trong CAU (riêng 1-1 sửa ở demXenKe)
// ============================================================================
// [tên, mẫu, chu kỳ lặp, màu ván kế được tính ĐẸP, số con đầu được thiếu khi mới bắt đầu chuỗi, g]
//  - mẫu: a = màu con đầu, b = màu kia
//  - chu kỳ lặp: cửa sổ lùi 1 chu kỳ cũng khớp thì là chuỗi đang lặp, bỏ qua (chỉ chấm lúc hình thành)
//  - g = true: con ngay trước cửa sổ phải khác màu con đầu (khối đầu không bị dính khối dài)
const CAU = [
    ["2-2", "abaabb", 0, "a", 2],
    ["2-2 plus", "abbaab", 2, "b"],
    ["3-3", "abbbaaa", 3, "b", 1, true], ["3-3 plus", "aaabbba", 3, "a", 0, true],
    ["4-4", "abbbbaaaa", 4, "b", 1, true], ["4-4 plus", "aaaabbbba", 4, "a", 0, true],
    ["2-1", "abbabb", 3, "a"], ["2-1 plus", "abbabba", 3, "b"],
    ["3-1", "abbbabbb", 4, "a"], ["3-1 plus", "abbbabbba", 4, "b"],
    ["4-1", "abbbbabbbb", 5, "a"], ["4-1 plus", "abbbbabbbba", 5, "b"],
    ["123", "abaabbb", 6, "a"], ["123 plus", "abaabbba", 6, "a"],
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

// Tách các khối cùng màu của s[0..end)
function tachKhoi(s, end) {
    const b = [];
    for (let i = 0; i < end; i++) {
        if (b.length && b[b.length - 1].c === s[i]) b[b.length - 1].n++;
        else b.push({ c: s[i], n: 1 });
    }
    return b;
}

// Số con xen kẽ liên tiếp tính ngược từ cuối s[0..end)
function demXenKe(s, end) {
    if (end <= 0) return 0;
    let n = 1;
    for (let i = end - 1; i > 0 && s[i] !== s[i - 1]; i--) n++;
    return n;
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

// Khối chẵn: 2 khối >= 2 con khác màu, khối thứ 3 cùng màu khối đầu. Trả về khối thứ 3 hoặc null.
function khoiChan(s, end) {
    const b = tachKhoi(s, end);
    if (b.length < 3) return null;
    const [b1, b2, b3] = b.slice(-3);
    if (b1.n >= 2 && b2.n >= 2 && b1.c !== b2.c && b3.c === b1.c) return b3;
    return null;
}

// Rà từ đầu mảng, trả về danh sách kết quả theo thứ tự thời gian: ["Đẹp", "Xấu", ...]
function layArrayXauDep(s) {
    const out = [];
    let khoa = false; // khóa của khối chẵn

    for (let i = 1; i < s.length; i++) {
        const hit = [];

        // ===== [1] 1-1 và 1-1 plus (không nằm trong CAU) =====
        // 4 con xen kẽ liền trước = 1-1, 5 con = 1-1 plus, từ 6 con trở lên bỏ qua
        // ván mới xen kẽ tiếp = đẹp, trùng con cuối = xấu
        const alt = demXenKe(s, i);
        if (alt === 4 || alt === 5) {
            hit.push(s[i] !== s[i - 1] ? DEP : XAU);
        }

        // ===== [2] Các cầu trong mảng CAU (2-2, 3-3, 4-4, 2-1, 3-1, 4-1, 123 + plus) =====
        for (const [, t, P, dep, m = 1, g = false] of CAU) {
            const a = khop(s, i, t, m, g);
            if (!a) continue;
            if (P && khop(s, i - P, t, m, g)) continue; // chuỗi đang lặp thì bỏ qua
            const mauDep = dep === "a" ? a : doiMau(a);
            hit.push(s[i] === mauDep ? DEP : XAU);
        }

        // ===== [3] Khối chẵn =====
        // Cầu ở [1] và [2] khớp rồi thì không chấm khối chẵn, nhưng vẫn khóa
        const kc = khoiChan(s, i);
        if (!kc) khoa = false;
        else if (!khoa && kc.n === 1) {
            if (hit.length === 0) hit.push(s[i] === kc.c ? DEP : XAU);
            khoa = true;
        }

        out.push(...hit);
    }
    return out;
}

// Từ arrayXauDep quyết định isDat và phe
//  1. SO_LIEN_TIEP kết quả cuối giống nhau: toàn xấu → phe Đẹp, toàn đẹp → phe Xấu
//  2. kết quả cuối là xấu và (tổng xấu − tổng đẹp) >= CHENH_LECH → phe Đẹp
//  3. kết quả cuối là đẹp và (tổng đẹp − tổng xấu) >= CHENH_LECH → phe Xấu
function xuLyXauDep(arrayXauDep) {
    const n = arrayXauDep.length;
    if (n === 0) return { isDat: false, phe: null };

    const cuoi = arrayXauDep[n - 1];

    if (n >= SO_LIEN_TIEP && arrayXauDep.slice(-SO_LIEN_TIEP).every((x) => x === cuoi)) {
        return { isDat: true, phe: cuoi === XAU ? DEP : XAU };
    }

    const soXau = arrayXauDep.filter((x) => x === XAU).length;
    const soDep = n - soXau;

    if (n >= SO_LIEN_TIEP_KemChenhLech && arrayXauDep.slice(SO_LIEN_TIEP_KemChenhLech).every((x) => x === cuoi)) {
        if (cuoi === XAU && soXau - soDep >= CHENH_LECH) return { isDat: true, phe: DEP };
        if (cuoi === DEP && soDep - soXau >= CHENH_LECH) return { isDat: true, phe: XAU };
    }


    return { isDat: false, phe: null };
}

function CheckChay2Ngam(arr = getKetQuaListTable()) {
    if (!Array.isArray(arr)) return { isDat: false, phe: null };

    const arrayXauDep = layArrayXauDep(layChuoi(arr));
    const kq = xuLyXauDep(arrayXauDep);

    // Log: isDat, chuỗi liên tiếp gần nhất (vd "2 Xấu"), tổng đẹp/xấu (vd "3 Đẹp, 2 Xấu")
    const n = arrayXauDep.length;
    const cuoi = arrayXauDep[n - 1];
    let chuoiCuoi = 0;
    while (chuoiCuoi < n && arrayXauDep[n - 1 - chuoiCuoi] === cuoi) chuoiCuoi++;
    const soXau = arrayXauDep.filter((x) => x === XAU).length;
    const soDep = n - soXau;
    console.clear();
    console.log(
        `⚠️ [CheckChay2Ngam]\n` +
        `   Đạt: ${kq.isDat ? "Có" : "Không"}\n` +
        `   Chuỗi liên tiếp: ${n ? `${chuoiCuoi} ${cuoi}` : "chưa có"}\n` +
        `   Phe ưu thế: ${soDep} ${DEP}, ${soXau} ${XAU}`
    );
    return kq;
}

module.exports = { CheckChay2Ngam };