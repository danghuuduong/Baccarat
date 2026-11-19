"use strict";

const setting = require("../State/setting");

const TIE = "T";

// Gom mảng thành các cột bệt (kiểu tài xỉu), bỏ qua Tie.
// VD: d d x x x d -> [{ mau: "d", dai: 2 }, { mau: "x", dai: 3 }, { mau: "d", dai: 1 }]
function GomCotBet(arr) {
    const cols = [];
    for (const x of arr) {
        if (x === TIE) continue;
        const last = cols[cols.length - 1];
        if (last && last.mau === x) last.dai++;
        else cols.push({ mau: x, dai: 1 });
    }
    return cols;
}

// Bộ lọc bệt:
//   1. Từ cuối mảng đi ngược, tìm cột gần nhất có dài >= 3 làm cột chuẩn.
//   2. Sau cột chuẩn phải có đúng 5 cột, cột thứ 5 là cột cuối mảng.
//   3. Cả 5 cột đó đều dài <= 2.
function LocBet(arr) {
    const cols = GomCotBet(arr);

    let iChuan = -1;
    for (let i = cols.length - 1; i >= 0; i--) {
        if (cols[i].dai >= 3) {
            iChuan = i;
            break;
        }
    }
    if (iChuan === -1) return false;                  // không có cột chuẩn

    const cotSau = cols.slice(iChuan + 1);
    if (cotSau.length !== 5) return false;            // phải đúng 5 cột sau chuẩn

    return cotSau.every((c) => c.dai <= 2);
}

// Trả về true nếu chuỗi cháy ngầm hiện tại >= soChuoiDat (mặc định 2), ngược lại false.
// Mảng đọc theo cột, mỗi cột 6 ô. Mỗi cột có 2 chu kỳ:
//   - Chu kỳ 1 (ô 1-3) theo màu ô 2 của cột trước
//   - Chu kỳ 2 (ô 4-6) theo màu ô 5 của cột trước
function CheckChay2Ngam(arr) {
    // Cần cột 1 đủ 6 ô và ít nhất 1 ô của cột 2
    if (!Array.isArray(arr) || arr.length < 7) return { chuoi: 0, isDat: false };

    // Chia mảng thành các cột 6 ô (cột cuối có thể dở dang)
    const cols = [];
    for (let i = 0; i < arr.length; i += 6) cols.push(arr.slice(i, i + 6));

    let chuoi = 0;

    for (let k = 1; k < cols.length; k++) {
        const cotChuan = cols[k - 1]; // cột liền trước luôn đủ 6 ô

        for (let cy = 0; cy < 2; cy++) {
            const tinHieu = cotChuan[cy === 0 ? 1 : 4]; // ô 2 hoặc ô 5
            const cacO = cols[k].slice(cy * 3, cy * 3 + 3);

            if (cacO.length === 0) continue;       // chu kỳ chưa có ô nào
            if (tinHieu === TIE) continue;         // tín hiệu là Tie thì bỏ qua chu kỳ

            if (cacO.includes(tinHieu)) {          // có ô trúng màu tín hiệu = ĂN
                chuoi = 0;
                continue;
            }

            if (cacO.length < 3) continue;         // mới ra 1-2 ô, chưa kết luận

            // Đủ 3 ô, không ô nào trúng. Bỏ ô Tie, nếu còn ô khác thì tính CHÁY
            const oKhacTie = cacO.filter((x) => x !== TIE);
            if (oKhacTie.length === 0) continue;   // cả 3 ô là Tie thì bỏ qua

            chuoi++;
        }
    }

    const soChuoiDat = setting.get("soChuoiDat") ?? 2;
    const quaLoc = LocBet(arr);                    // màng lọc bệt
    return { chuoi, isDat: chuoi >= soChuoiDat && quaLoc };
}

module.exports = { CheckChay2Ngam };