// src/Util/TimPhongDat_Util.js – Từ 8 mảng phòng, trả về danh sách phòng đạt điều kiện
"use strict";

const { DS_PHONG } = require("../config/RoomConfig");
const { CheckXanh3 } = require("./CheckChay2Ngam");
const { LayTinHieu } = require("./Laytinhieu_Util");

/**
 * @param {string[][]} phongRoomS  8 mảng ("B" | "P" | "T"), phòng không đạt giây thì là []
 * @returns {{uutien: number, phong: number, ten: string, x: number, y: number, arr: string[]}[]}
 */
function TimPhongDat_Util(phongRoomS = []) {
    const DanhSachTimPhong = [];

    phongRoomS.forEach((arr, i) => {
        if (!arr || arr.length === 0) return;               // phòng rỗng thì bỏ qua
        const tinHieu = LayTinHieu([...arr]);
        if (!tinHieu) return;                               // chỉ lọc theo cháy ngầm

        const kq = CheckXanh3(arr.slice(0, -2));
        if (!kq.isOk) return;

        DanhSachTimPhong.push({
            uutien: kq.uutien,
            phong: i + 1,                                   // số phòng 1..8
            ...DS_PHONG[i],                                 // ten, x, y
            arr
        });
    });

    return DanhSachTimPhong;
}

module.exports = { TimPhongDat_Util };