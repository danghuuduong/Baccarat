// src/config/CuocConfig.js – Cấu hình đặt cược (toạ độ click, kế hoạch thép, hoa hồng)
"use strict";

// ── Toạ độ click trên màn hình ───────────────────────────────────────────────
const TOA_DO = {
    chip: {
        10: { x: 420, y: 681 },
        20: { x: 464, y: 681 },
        50: { x: 508, y: 681 },
        100: { x: 550, y: 681 },
        200: { x: 600, y: 681 },
    },
    ben: {
        blue: { x: 500, y: 620 },
        red: { x: 800, y: 620 },
    },
    xacNhan: { x: 715, y: 688 },
};

// ── Thép → số tiền thật + các bước click ─────────────────────────────────────
// Mỗi bước: chọn chip `chip`, rồi bấm bên `lan` lần.
// Lưu ý: chip lớn bấm TRƯỚC, chip nhỏ bấm SAU (tránh sàn tự nâng chip nhỏ).
const KE_HOACH = {
    1: { tien: 20, buoc: [{ chip: 20, lan: 1 }] },                         // thép 1 (10) tự nhân đôi thành 20
    2: { tien: 50, buoc: [{ chip: 50, lan: 1 }] },
    3: { tien: 110, buoc: [{ chip: 100, lan: 1 }, { chip: 10, lan: 1 }] }, // 100 + 10 = 110
    4: { tien: 40, buoc: [{ chip: 20, lan: 2 }] },                         // chip 20, bấm bên 2 lần = 40
    5: { tien: 100, buoc: [{ chip: 100, lan: 1 }] },
    6: { tien: 220, buoc: [{ chip: 200, lan: 1 }, { chip: 20, lan: 1 }] }, // 200 + 20 = 220
};

// ── Thông số khác ────────────────────────────────────────────────────────────
const HOA_HONG_RED = 0.05;  // Thắng bên Red bị trừ 5% trên tiền lãi
const CLICK_DELAY_MS = 150; // Nghỉ giữa các lần click (ms)



const DS_TRANG_THAI = [
    "ChucMayMan", "CoHoiCuoiCung",      // Điều kiện đặt cược
    "Green_Hoa", "Red_Win", "Blue_Win", // Kết quả mở bài
    "DangChoMoBai", "VuiLongCho_XaoBai", // Chờ – không làm gì
];
const THEP_CUOI = 3;        // Thua ở thép này thì chu kì thắng bị trừ 1


module.exports = { TOA_DO, KE_HOACH, HOA_HONG_RED, CLICK_DELAY_MS, DS_TRANG_THAI, THEP_CUOI };