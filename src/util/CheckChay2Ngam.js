"use strict";

const TIE = "T";
const SO_CHUOI_DAT = 2; // cháy liên tiếp từ 2 chu kỳ trở lên thì đạt

// Trả về true nếu chuỗi cháy ngầm hiện tại >= 2, ngược lại false.
// Mảng đọc theo cột, mỗi cột 6 ô. Mỗi cột có 2 chu kỳ:
//   - Chu kỳ 1 (ô 1-3) theo màu ô 2 của cột trước
//   - Chu kỳ 2 (ô 4-6) theo màu ô 5 của cột trước
function CheckChay2Ngam(arr) {
    // Cần cột 1 đủ 6 ô và ít nhất 1 ô của cột 2
    // if (!Array.isArray(arr) || arr.length < 7) return false;
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

    // console.log(`⚠️ [CheckChay2Ngam] ngầm = ${chuoi} → ${chuoi >= SO_CHUOI_DAT}`);
    // return chuoi >= SO_CHUOI_DAT;
    return { chuoi, isDat: chuoi >= SO_CHUOI_DAT };
}

module.exports = { CheckChay2Ngam };