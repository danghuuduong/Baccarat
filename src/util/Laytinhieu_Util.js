"use strict";

const DO_DAI_XANH = 2;

const BANKER = "B"; // đỏ  → "d"
const PLAYER = "P"; // xanh → "x"

// ============================================================================
// Trả về { tinhieu: "d" | "x", cauphatHien: "2-2" } cho ván kế tiếp.
// Luôn trả về bên cầu ĐẸP (đi tiếp theo cầu). Việc đánh ngược là của chỗ gọi,
// dựa vào CheckChay2Ngam. Không có cầu nào đang hình thành thì trả null.
//
// CHỈ NHẬN DẠNG 2-2 và 2-2 plus, giống hệt CheckChay2Ngam.
// Sửa cầu ở CheckChay2Ngam thì nhớ sửa luôn ở đây cho khớp.
// ============================================================================

// [tên, mẫu, chu kỳ lặp, màu ván kế được tính ĐẸP, số con đầu được thiếu khi mới bắt đầu chuỗi, g]
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

function LayTinHieu(arr) {
    if (!Array.isArray(arr)) return null;

    const s = layChuoi(arr);
    const n = s.length;
    if (n < 1) return null;

    for (const [ten, t, P, dep, m = 1, g = false] of CAU) {
        const a = khop(s, n, t, m, g);
        if (!a) continue;
        if (P && khop(s, n - P, t, m, g)) continue; // chuỗi đang lặp thì bỏ qua
        return { tinhieu: dep === "a" ? a : doiMau(a), cauphatHien: ten };
    }

    return null;
}

module.exports = { LayTinHieu };