// src/util/TimPhongDat_Util.js – Từ 8 mảng phòng, trả về danh sách phòng đạt điều kiện
"use strict";

const { DS_PHONG } = require("../config/RoomConfig");
const { CheckChay2Ngam } = require("./CheckChay2Ngam");
const { LayTinHieu } = require("./Laytinhieu_Util");

/**
 * @param {string[][]} phongRoomS  8 mảng ("B" | "P" | "T"), phòng không đạt giây thì là []
 * @returns {{ChayNgam: number, RoomCuThe: number, ten: string, x: number, y: number}[]}
 *          vd: [{ ChayNgam: 3, RoomCuThe: 1, ten: "Room1", x: 511, y: 217 }, ...]
 */
function TimPhongDat_Util(phongRoomS = []) {
    const DanhSachTimPhong = [];

    phongRoomS.forEach((arr, i) => {
        if (!arr || arr.length === 0) return;               // phòng rỗng thì bỏ qua

        const { chuoi, isDat } = CheckChay2Ngam(arr);
        const tinHieu = LayTinHieu(arr);                     // { tinhieu, thep } | null
        if (!isDat || !tinHieu) return;                               // chỉ lọc theo cháy ngầm


        DanhSachTimPhong.push({
            phong: i + 1,                                // số phòng 1..8
            ngam: chuoi,
            ...DS_PHONG[i],                                  // ten, x, y
            infoTinHieu: {
                isTinHieu: !!tinHieu,                            // có tín hiệu hay không
                tinhieu: tinHieu ? tinHieu.tinhieu : null,   // "blue" | "red" | "green" | null
                thep: tinHieu ? tinHieu.thep : null,         // 1 | 2 | 3 | null
            },
            arr
        });
    });

    DanhSachTimPhong.sort((a, b) => b.ngam - a.ngam);
    return DanhSachTimPhong;
}

module.exports = { TimPhongDat_Util };