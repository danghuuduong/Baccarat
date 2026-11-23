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
        if (!arr || arr.length === 0) return;
        // phòng rỗng thì bỏ qua
        const sach = arr.filter(x => x === "B" || x === "P");
        const tinHieu = LayTinHieu(sach);
        const kq = CheckXanh3(sach.slice(0, -2));

        if (tinHieu && kq.isOk && kq.uutien >= 1) {
            DanhSachTimPhong.push({
                uutien: kq.uutien,
                phong: i + 1,                                   // số phòng 1..8
                ...DS_PHONG[i],                                 // ten, x, y
                arr
            });
        }               // chỉ lọc theo cháy ngầm
        return

    });

    return DanhSachTimPhong;
}

module.exports = { TimPhongDat_Util };