// src/config/RoomConfig.js – Cấu hình phòng chơi (toạ độ tiêu điểm các phòng, nút thoát phòng)
"use strict";

// ── Toạ độ tiêu điểm từng phòng (x, y) ──────────────────────────────────────
const ROOMS = [
    { id: 1, x: 320, y: 380 },
    { id: 2, x: 640, y: 380 },
    { id: 3, x: 950, y: 380 },
    { id: 4, x: 320, y: 530 },
    { id: 5, x: 640, y: 530 },
    { id: 6, x: 950, y: 530 },
    { id: 7, x: 320, y: 650 },
    { id: 8, x: 640, y: 650 },
    { id: 9, x: 950, y: 650 },
];

// ── Toạ độ click nút thoát phòng ─────────────────────────────────────────────
const TOA_DO_THOAT_PHONG = { x: 1191, y: 370 };

module.exports = {
    ROOMS,
    TOA_DO_THOAT_PHONG,
};

