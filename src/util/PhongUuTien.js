// src/util/PhongUuTien.js – Quản lý danh sách phòng ưu tiên (ngầm >= 1)
// Flow:
//   Pha Quét  : duyệt tuần tự phòng 0→17; ghi nhận phòng có ngầm >= 1
//   Pha Ưu Tiên: nhảy qua lại trong ds ưu tiên cho tới khi ngầm >= 2 hoặc ds rỗng
//   Khi ds rỗng → quay lại Pha Quét từ phòng 0
"use strict";

const TONG_PHONG = 18; // phòng 1-18 → index 0-17

// ── State ─────────────────────────────────────────────────────────────────────
let danhSachUuTien = []; // [{ roomIdx, soNgam }] – roomIdx là 0-based
let dangQuet = true;     // true = Pha Quét, false = Pha Ưu Tiên
let chiSoQuet = 0;       // con trỏ trong Pha Quét (0-17)
let chiSoUuTien = 0;     // con trỏ trong Pha Ưu Tiên

// ── Reset toàn bộ (dùng khi dừng bot / bắt đầu mới) ─────────────────────────
function ResetUuTien() {
    danhSachUuTien = [];
    dangQuet = true;
    chiSoQuet = 0;
    chiSoUuTien = 0;
    console.log("[PhongUuTien] 🔄 Reset – bắt đầu quét từ phòng 1");
}

// ── Ghi nhận kết quả fill 24 ô tại phòng idx ─────────────────────────────────
// soNgam: số ngầm thực tế (integer >= 0)
function GhiNhanPhong(roomIdx, soNgam) {
    if (soNgam < 1) {
        // ngầm = 0: đảm bảo xoá khỏi ds ưu tiên nếu có
        _loaiKhoiUuTien(roomIdx);
        return;
    }

    // ngầm >= 1: thêm hoặc cập nhật
    const existing = danhSachUuTien.find(p => p.roomIdx === roomIdx);
    if (existing) {
        existing.soNgam = soNgam;
        console.log(`[PhongUuTien] ✏️ Cập nhật Room ${roomIdx + 1}: ngầm=${soNgam}`);
    } else {
        danhSachUuTien.push({ roomIdx, soNgam });
        console.log(`[PhongUuTien] ⭐ Thêm Room ${roomIdx + 1} vào ds ưu tiên (ngầm=${soNgam})`);
    }
}

// ── Loại phòng khỏi ds ưu tiên (khi ngầm tụt về 0) ──────────────────────────
function LoaiPhong(roomIdx) {
    _loaiKhoiUuTien(roomIdx);
}

function _loaiKhoiUuTien(roomIdx) {
    const idx = danhSachUuTien.findIndex(p => p.roomIdx === roomIdx);
    if (idx !== -1) {
        danhSachUuTien.splice(idx, 1);
        console.log(`[PhongUuTien] 🗑️ Xoá Room ${roomIdx + 1} khỏi ds ưu tiên`);

        // Điều chỉnh con trỏ để không bị lệch sau khi xoá
        if (chiSoUuTien >= danhSachUuTien.length && danhSachUuTien.length > 0) {
            chiSoUuTien = 0;
        }
    }
}

// ── Lấy phòng tiếp theo cần vào (trả về roomIdx 0-based) ─────────────────────
//
// Logic:
//   Pha Quét  → trả chiSoQuet, tăng chiSoQuet++
//               Khi chiSoQuet == TONG_PHONG:
//                 - Nếu ds ưu tiên rỗng → quét lại từ 0
//                 - Nếu có ds ưu tiên    → chuyển sang Pha Ưu Tiên
//
//   Pha Ưu Tiên → nhảy vòng trong danhSachUuTien
//               Khi ds rỗng → quay lại Pha Quét từ phòng 0
//
function LayPhongTiep() {
    if (dangQuet) {
        const roomIdx = chiSoQuet;
        chiSoQuet++;

        if (chiSoQuet >= TONG_PHONG) {
            // Hết 18 phòng
            if (danhSachUuTien.length > 0) {
                // Có phòng ưu tiên → chuyển sang Pha Ưu Tiên
                dangQuet = false;
                chiSoUuTien = 0;
                console.log(`[PhongUuTien] 🔍 Quét xong → Pha Ưu Tiên: [${danhSachUuTien.map(p => `Room${p.roomIdx + 1}(ngầm=${p.soNgam})`).join(", ")}]`);
            } else {
                // Không có phòng ưu tiên → quét lại từ đầu
                chiSoQuet = 0;
                console.log("[PhongUuTien] 🔄 Không có phòng ưu tiên, quét lại từ phòng 1");
            }
        }

        console.log(`[PhongUuTien] 📍 [QuétPhase] → Room ${roomIdx + 1}`);
        return roomIdx;
    }

    // Pha Ưu Tiên
    if (danhSachUuTien.length === 0) {
        // Hết ds ưu tiên → quay lại Pha Quét
        dangQuet = true;
        chiSoQuet = 0;
        chiSoUuTien = 0;
        console.log("[PhongUuTien] 🔄 Hết ds ưu tiên → Quét lại từ phòng 1");
        return LayPhongTiep(); // đệ quy 1 lần để lấy phòng quét đầu tiên
    }

    // Nhảy vòng trong ds ưu tiên
    if (chiSoUuTien >= danhSachUuTien.length) chiSoUuTien = 0;
    const entry = danhSachUuTien[chiSoUuTien];
    chiSoUuTien = (chiSoUuTien + 1) % danhSachUuTien.length;

    console.log(`[PhongUuTien] ⭐ [UuTienPhase] → Room ${entry.roomIdx + 1} (ngầm=${entry.soNgam})`);
    return entry.roomIdx;
}

// ── Lấy snapshot state (dùng để log / UI) ────────────────────────────────────
function GetUuTienState() {
    return {
        dangQuet,
        chiSoQuet,
        danhSachUuTien: danhSachUuTien.map(p => ({ roomIdx: p.roomIdx, roomSo: p.roomIdx + 1, soNgam: p.soNgam })),
    };
}

module.exports = { GhiNhanPhong, LoaiPhong, LayPhongTiep, ResetUuTien, GetUuTienState };

