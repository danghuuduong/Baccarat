"use strict";
const { showThongBao } = require("../UI/UI_ThongBao");
const setting = require("../State/setting");
const { DocLuoiTable } = require("./DocLuoiTable");
const { TimAnhDuaTrenListPop_Util } = require("./TimAnhDuaTrenListPop_Util");
const { typeRoom } = require("../config/RoomConfig");

// Chốt sổ: lưới bi đã khớp thì lưu vào đây
let arraySuDungChinhList = [];
let daChotSo = false;

async function xulyVoPhong_Util(page, danhSach) {

    if (!danhSach || danhSach.length === 0) return;

    // Chọn phòng có ngam lớn nhất; bằng nhau thì chọn phòng có thép lớn nhất
    const phongTotNhat = danhSach.reduce((max, phong) => {
        if (phong.ngam !== max.ngam) return phong.ngam > max.ngam ? phong : max;
        return phong.infoTinHieu.thep > max.infoTinHieu.thep ? phong : max;
    });
    console.log("phongTotNhat", phongTotNhat)

    // ── Lần 1: Click vào phòng được chọn ──────────────────────────────────
    await page.mouse.click(
        Math.round(phongTotNhat.x),
        Math.round(phongTotNhat.y)
    );

    // Check loại phòng trong 3 giây
    let roomType = await TimAnhDuaTrenListPop_Util(page, [typeRoom.room_a, typeRoom.room_b], 3000);

    if (!roomType) {
        // ── Lần 2: Click lại + tìm thêm 2 giây ──────────────────────────────
        await page.mouse.click(
            Math.round(phongTotNhat.x),
            Math.round(phongTotNhat.y)
        );
        roomType = await TimAnhDuaTrenListPop_Util(page, TYPE_ROOM_NAMES, 2000);
    }

    if (!roomType) {
        showThongBao(page, "Có lỗi khi vô phòng, khởi động tìm lại vòng lặp", 10000);
        setting.set("danhSachTimKiemRa", []);
        setting.set("tabHienTai", 1);
        setting.set("isStart", true);

        // require lười để khỏi vòng lặp import; setTimeout để vòng cũ thoát hẳn (dangChay = false) rồi mới chạy
        const { vongLapChupManHinh } = require("./VongLapChupManHinh");
        setTimeout(() => vongLapChupManHinh(page), 0);
        return;
    }

    // Nhận ra loại phòng thành công → so khớp lưới bi
    const khop = await soKhopLuoi(page, roomType, phongTotNhat);

    if (!khop) {
        showThongBao(page, "Kết Quả Đang sai lệch", 10000);
        setting.set("danhSachTimKiemRa", []);
        setting.set("tabHienTai", 1);
        setting.set("isStart", true);
        arraySuDungChinhList = [];
        daChotSo = false;
        const { vongLapChupManHinh } = require("./VongLapChupManHinh");
        setTimeout(() => vongLapChupManHinh(page), 0);
        return;
    }

    // ── Khớp: đã chốt sổ → phần đặt cược ─────────────────────────────────
    // TODO: logic đặt cược
    console.log("[xulyVoPhong] ✅ Chốt sổ:", arraySuDungChinhList.join(""));

    console.log(`[xulyVoPhong] ✅ Loại phòng: ${roomType}`);
    const thongBao = `Tab-${phongTotNhat.tab}, Phòng: ${phongTotNhat.phong}, Ngầm: ${phongTotNhat.ngam}, Thép: ${phongTotNhat.infoTinHieu.thep} | ${roomType}`;
    showThongBao(page, thongBao, 30000);


    return roomType;
}

/**
 * Đọc lưới bi theo loại phòng, so với n item cuối của phongTotNhat.arr.
 * Khớp: chốt sổ (arraySuDungChinhList, daChotSo) và trả true. Không khớp hoặc lưới rỗng: false.
 */
async function soKhopLuoi(page, roomType, phongTotNhat) {
    let luoi = [];

    if (roomType === typeRoom.room_a) {
        luoi = await DocLuoiTable(page, { goc1: { x: 136, y: 587 }, goc2: { x: 438, y: 695 }, cot: 15, hang: 6 });
    } else if (roomType === typeRoom.room_b) {
        luoi = await DocLuoiTable(page, { goc1: { x: 121, y: 596 }, goc2: { x: 301, y: 707 }, cot: 9, hang: 6 });
    }
    const arr = phongTotNhat.arr || [];

    const m = Math.min(luoi.length, arr.length);
    if (m === 0) return false;

    const a = luoi.slice(-m);
    const b = arr.slice(-m);

    const bang = a.every((v, i) => v === b[i]);
    if (!bang) return false;

    arraySuDungChinhList = luoi;
    daChotSo = true;
    return true;
}

module.exports = { xulyVoPhong_Util };