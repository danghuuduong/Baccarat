// src/Util/TimPhongDat_Util.js – Từ 8 mảng phòng, trả về danh sách phòng đạt điều kiện
"use strict";

const { DS_PHONG } = require("../config/RoomConfig");
const { CheckChay2Ngam } = require("./CheckChay2Ngam");
const { CheckChay2Ngam2 } = require("./CheckChay2Ngam2");
const { LayTinHieu } = require("./Laytinhieu_Util");
const { LayTinHieu2 } = require("./Laytinhieu_Util2");

/**
 * Mỗi phòng đạt tối đa 1 lần, gắn loai:
 *   "v2" = CheckChay2Ngam2 đạt + LayTinHieu2 có tín hiệu (không plus) -> ƯU TIÊN
 *   "v1" = CheckChay2Ngam  đạt + LayTinHieu  có tín hiệu (có plus)
 *
 * @param {string[][]} phongRoomS  8 mảng ("B" | "P" | "T"), phòng không đạt giây thì là []
 * @returns {{phong: number, loai: "v1"|"v2", ngam: number, type: string, x: number, y: number}[]}
 */
function TimPhongDat_Util(phongRoomS = []) {
    const DanhSachTimPhong = [];

    phongRoomS.forEach((arr, i) => {
        if (!arr || arr.length === 0) return; // phòng rỗng thì bỏ qua

        // ── v2 (ưu tiên) ──
        const check2 = CheckChay2Ngam2(arr);
        const tinHieu2 = LayTinHieu2([...arr]);
        if (check2?.isDat && tinHieu2) {
            DanhSachTimPhong.push({
                phong: i + 1,
                loai: "v2",
                ngam: check2.chuoiLienTiep,
                type: check2.type,
                ...check2,
                ...DS_PHONG[i], // ten, x, y
                arr,
            });
            return;
        }

        // ── v1 ──
        const check1 = CheckChay2Ngam(arr);
        const tinHieu1 = LayTinHieu([...arr]);
        if (check1?.isDat && tinHieu1) {
            DanhSachTimPhong.push({
                phong: i + 1,
                loai: "v1",
                ngam: check1.chuoiLienTiep,
                type: check1.type,
                ...check1,
                ...DS_PHONG[i], // ten, x, y
                arr,
            });
        }
    });

    DanhSachTimPhong.sort((a, b) => b.ngam - a.ngam);
    return DanhSachTimPhong;
}

module.exports = { TimPhongDat_Util };