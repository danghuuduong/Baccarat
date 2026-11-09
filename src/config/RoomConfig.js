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

const DS_PHONG = [
    { ten: "Phòng-1", x: 511, y: 217 },
    { ten: "Phòng-2", x: 960, y: 217 },

    { ten: "Phòng-3", x: 511, y: 377 },
    { ten: "Phòng-4", x: 960, y: 377 },

    { ten: "Phòng-5", x: 511, y: 540 },
    { ten: "Phòng-6", x: 960, y: 540 },

    { ten: "Phòng-7", x: 511, y: 701 },
    { ten: "Phòng-8", x: 960, y: 701 },
];

const ToaDoTab = [
    { tab: 1, x: 53, y: 253 },
    { tab: 2, x: 53, y: 297 },
];

// room-type_room_a – toạ độ chip (ghi chú tham khảo, không phải code)
// x=541,y=689 | x=584,y=688 | x=628,y=691 | x=675,y=689 | x=724,y=687

const typeRoom = {
    room_a: "type_room_a",
    room_b: "type_room_b"
}

const typeKetQua = {
    [typeRoom.room_a]: {
        blue: "kq_blue_type_A",
        red: "kq_red_type_A",
        green: "kq_green_type_A",

    },
    [typeRoom.room_b]: {
        blue: "kq_blue_type_B",
        red: "kq_red_type_B",
        green: "kq_green_type_B",

    },
}

const typeKetQuaToaDo = {
    [typeRoom.room_a]: {
        blue: { x: 532, y: 678 },   // TODO: P
        red: { x: 861, y: 678 },   // TODO: B
        green: { x: 663, y: 678 },   // TODO: T
    },
    [typeRoom.room_b]: {
        blue: { x: 185, y: 480 },   // TODO: P
        red: { x: 829, y: 438 },   // TODO: B
        green: { x: 754, y: 506 },   // TODO: T
    },
};

const TaoDoChip_Room = {
    [typeRoom.room_a]: {
        chip10: { x: 492, y: 686 },
        chip20: { x: 541, y: 686 },
        chip50: { x: 586, y: 686 },
        chip100: { x: 634, y: 686 },
        chip500: { x: 677, y: 686 },
        chip1000: { x: 716, y: 686 },
        datCuoc_Blue: { x: 590, y: 619 },
        datCuoc_Red: { x: 809, y: 618 },
        buttonXacNhan: { x: 900, y: 686 }
    },
    [typeRoom.room_b]: {
        chip10: { x: 933, y: 560 },
        chip20: { x: 988, y: 560 },
        chip50: { x: 1043, y: 560 },
        chip100: { x: 1094, y: 560 },
        chip500: { x: 1147, y: 560 },
        chip1000: { x: 1200, y: 560 },
        datCuoc_Blue: { x: 459, y: 470 },
        datCuoc_Red: { x: 983, y: 470 },
        buttonXacNhan: { x: 786, y: 567 }
    }
}


// ── Toạ độ click nút thoát phòng ─────────────────────────────────────────────
const TOA_DO_THOAT_PHONG = { x: 1250, y: 32 };

module.exports = {
    ROOMS,
    TOA_DO_THOAT_PHONG,
    DS_PHONG,
    ToaDoTab,
    TaoDoChip_Room,
    typeRoom,
    typeKetQua,
    typeKetQuaToaDo
};

