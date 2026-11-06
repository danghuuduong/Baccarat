"use strict";

const { getKetQuaListTable } = require("../State/ketQuaListState");

const BANKER = "KetQua_Banker"; // đỏ  → "d"
const PLAYER = "KetQua_Player"; // xanh → "x"

// ============================================================================
// Trả về { tinhieu: "d" | "x", cauphatHien: "1-1" } cho ván kế tiếp.
// Luôn trả về bên cầu ĐẸP (đi tiếp theo cầu). Việc đánh ngược (đẹp nhiều quá thì
// đánh xấu, xấu nhiều quá thì đánh đẹp) là của chỗ gọi, dựa vào CheckChay2Ngam.
// Không có cầu nào đang hình thành thì trả null.
//
// Nhận dạng cầu GIỐNG HỆT CheckChay2Ngam (cùng mảng CAU, khop, demXenKe, khối chẵn).
// Sửa cầu ở CheckChay2Ngam thì nhớ sửa luôn ở đây cho khớp.
//
// Thứ tự ưu tiên khi nhiều cầu cùng khớp:
//   [1] 1-1, 1-1 plus  →  [2] các cầu trong CAU theo thứ tự  →  [3] khối chẵn
// ============================================================================

// [tên, mẫu, chu kỳ lặp, màu ván kế được tính ĐẸP, số con đầu được thiếu khi mới bắt đầu chuỗi, g]
//  - mẫu: a = màu con đầu, b = màu kia
//  - chu kỳ lặp: cửa sổ lùi 1 chu kỳ cũng khớp thì là chuỗi đang lặp, bỏ qua (chỉ phát lúc hình thành)
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

function LayTinHieu(arr = getKetQuaListTable()) {
    if (!Array.isArray(arr)) return null;

    const s = layChuoi(arr);
    const n = s.length;
    if (n < 1) return null;

    // ===== [1] 1-1 và 1-1 plus =====
    // 4 con xen kẽ = 1-1, 5 con = 1-1 plus, từ 6 con trở lên bỏ qua
    // bên cầu đẹp = xen kẽ tiếp = đổi màu con cuối
    const alt = demXenKe(s, n);
    if (alt === 4 || alt === 5) {
        return { tinhieu: doiMau(s[n - 1]), cauphatHien: alt === 4 ? "1-1" : "1-1 plus" };
    }

    // ===== [2] Các cầu trong mảng CAU =====
    for (const [ten, t, P, dep, m = 1, g = false] of CAU) {
        const a = khop(s, n, t, m, g);
        if (!a) continue;
        if (P && khop(s, n - P, t, m, g)) continue; // chuỗi đang lặp thì bỏ qua
        return { tinhieu: dep === "a" ? a : doiMau(a), cauphatHien: ten };
    }

    // ===== [3] Khối chẵn =====
    // Có khóa nên phải rà từ đầu để biết đã khóa chưa
    let khoa = false;
    for (let i = 1; i < n; i++) {
        const k = khoiChan(s, i);
        if (!k) khoa = false;
        else if (!khoa && k.n === 1) khoa = true;
    }
    const kc = khoiChan(s, n);
    if (kc && !khoa && kc.n === 1) {
        return { tinhieu: kc.c, cauphatHien: "Khối chẵn" };
    }

    return null;
}

module.exports = { LayTinHieu };