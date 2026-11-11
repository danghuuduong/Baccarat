// src/config/RoomConfig.js – Cấu hình phòng chơi (toạ độ tiêu điểm các phòng, nút thoát phòng)
"use strict";


// Tìm phòng đạt để click
const DS_PHONG = [
    { ten: "Phòng-1", x: 189.46, y: 82.5 },
    { ten: "Phòng-2", x: 590.1, y: 82.5 },

    { ten: "Phòng-3", x: 189.46, y: 226.8 },
    { ten: "Phòng-4", x: 590.1, y: 226.8 },

    { ten: "Phòng-5", x: 189.46, y: 371.4 },
    { ten: "Phòng-6", x: 590.1, y: 371.4 },

    { ten: "Phòng-7", x: 189.46, y: 516.06 },
    { ten: "Phòng-8", x: 590.1, y: 516.06 },
];

const ToaDoTab = [
    { tab: 1, x: 114, y: 231 },
    { tab: 2, x: 114, y: 262 },
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
        blue: { x: 541.25, y: 562 },   // TODO: P
        red: { x: 839, y: 562 },   // TODO: B
        green: { x: 729.923, y: 610 },   // TODO: T
    },
    [typeRoom.room_b]: {
        blue: { x: 232.8, y: 452.7 },   // TODO: P
        red: { x: 1146, y: 452.243 },   // TODO: B
        green: { x: 604.743, y: 454.765 },   // TODO: T
    },
};


const typeStatusBatDauToaDo = {
    [typeRoom.room_a]: {
        xanh: { x: 241.59, y: 70.165 },   // TODO: P
    },
    [typeRoom.room_b]: {
        xanh: { x: 228.95, y: 96.245 },   // TODO: P
    },
};
const TaoDoChip_Room = {
    [typeRoom.room_a]: {
        chip10: { x: 510.4, y: 615.8 },
        chip20: { x: 549, y: 615.8 },
        chip50: { x: 590, y: 615.8 },
        chip100: { x: 630, y: 615.8 },
        chip500: { x: 670, y: 615.8 },
        chip1000: { x: 715, y: 615.8 },
        datCuoc_Blue: { x: 600, y: 550 },
        datCuoc_Red: { x: 792, y: 550.8 },
        buttonXacNhan: { x: 870, y: 615.8 }
    },
    [typeRoom.room_b]: {
        chip10: { x: 905, y: 504 },
        chip20: { x: 950, y: 504 },
        chip50: { x: 1000, y: 504 },
        chip100: { x: 1045, y: 504 },
        chip500: { x: 1092, y: 504 },
        chip1000: { x: 1139, y: 504 },
        datCuoc_Blue: { x: 400, y: 427 },
        datCuoc_Red: { x: 970, y: 427 },
        buttonXacNhan: { x: 778, y: 508 }
    }
}


// ── Toạ độ click nút thoát phòng ─────────────────────────────────────────────
const TOA_DO_THOAT_PHONG = { x: 1180, y: 25 };

module.exports = {
    TOA_DO_THOAT_PHONG,
    DS_PHONG,
    ToaDoTab,
    TaoDoChip_Room,
    typeRoom,
    typeKetQua,
    typeKetQuaToaDo,
    typeStatusBatDauToaDo
};

