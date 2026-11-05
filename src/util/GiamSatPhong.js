// src/util/GiamSatPhong.js – Giám sát trạng thái phòng Baccarat
"use strict";

const { checkOnce } = require("./checker");
const { captureItems, IMAGES_DIR } = require("../captureState");

const NGUONG = {
    Green_Hoa: 0.97,
    Red_Win: 0.97,
    Blue_Win: 0.97,
};
const NGUONG_MAC_DINH = 0.90;
// ── State giám sát (module-scoped, dùng chung với main.js qua getter) ────────
let tamDungGiamSat = false; // true: vòng lặp đứng yên, không chụp

function DungGiamSat() { tamDungGiamSat = true; }
function TiepTucGiamSat() { tamDungGiamSat = false; }
function isTamDung() { return tamDungGiamSat; }

/**
 * Vòng lặp giám sát độc lập – phát hiện trạng thái đổi thì gọi onTrangThaiMoi.
 * Chỉ chạy 1 instance cùng lúc (guard bằng tham chiếu state ngoài).
 *
 * @param {import('playwright').Page} page
 * @param {string[]}  dsTrangThai   - Danh sách tên ảnh cần dò
 * @param {object}    roomState     - { TrongRoomReady, khoaVongLap, trangThaiHienTai }
 *                                    (object tham chiếu để đọc/ghi từ bên ngoài)
 * @param {Function}  onTrangThaiMoi - async (trangThai) => void  – callback khi state đổi
 * @param {number}    [intervalMs]  - Tần suất check (ms), mặc định 1000
 */
async function GiamSatTrangThai(page, dsTrangThai, roomState, onTrangThaiMoi, intervalMs = 1000) {
    if (roomState.khoaVongLap) return;
    roomState.khoaVongLap = true;
    try {
        while (roomState.TrongRoomReady) {
            if (tamDungGiamSat) {
                await sleep(150);
                continue;
            }
            try {
                const ttNew = await TimTrangThaiRoom(page, dsTrangThai, roomState); // Kiểm tra Đang mở bài hay làm gì
                if (!roomState.TrongRoomReady) break;
                if (tamDungGiamSat) continue;

                if (ttNew && ttNew !== roomState.trangThaiHienTai) {
                    roomState.trangThaiHienTai = ttNew;// ví dụ như Đang mở bài set vô
                    await onTrangThaiMoi(ttNew);
                }
            } catch (_) { }
            await sleep(roomState.trangThaiHienTai === "DangChoMoBai" ? 333 : intervalMs);
        }
    } finally {
        roomState.khoaVongLap = false;
        roomState.trangThaiHienTai = null;
        tamDungGiamSat = false;
    }
}

/**
 * Chụp 1 lượt, trả tên trạng thái khớp hoặc null.// Kiểm tra Đang mở bài hay làm gì
 */
async function TimTrangThaiRoom(page, names, roomState) {
    for (const name of names) {
        if (!roomState.TrongRoomReady || tamDungGiamSat) return null;
        const it = captureItems.find(i => i.name === name);
        if (!it) continue;
        try {
            const res = await checkOnce(page, IMAGES_DIR, it.x, it.y, it.width, it.height, NGUONG[name] ?? NGUONG_MAC_DINH);
            if (res && res.name === name) return name;
        } catch (_) { }
    }
    return null;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

module.exports = { GiamSatTrangThai, DungGiamSat, TiepTucGiamSat, isTamDung };

