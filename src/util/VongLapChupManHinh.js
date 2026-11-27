
// src/Util/VongLapChupManHinh.js
"use strict";

const setting = require("../State/setting");
const { docBan } = require("./DocBi");
const { docGiay } = require("./DocGiay");
const { update_UI_KetQua8Phong } = require("../UI/UI_KetQua8Phong");
const { TimPhongDat_Util } = require("./TimPhongDat_Util");
const { ToaDoTab } = require("../config/RoomConfig");
const { xulyVoPhong_Util } = require("./xulyVoPhong_Util");
const { randomSleep } = require("./Sleep_Util");

const BAT_TAB_2 = false;

const SO_LAN_TRUOT_DE_XOA = 2;

// Cấu hình cuộn giống code mẫu
const DELTA_CUON = 3333;
const SO_CU_XUONG = 4;
const SO_CU_LEN = 5;
const GIAN_CACH_CU_MS = [20, 30];
const CHO_SAU_CUON_MS = [140, 180];

// Cuộn chuột
async function cuon(page, toaDo, huong) {
    await page.mouse.move(toaDo.x, toaDo.y);

    const soCu = huong === 1 ? SO_CU_XUONG : SO_CU_LEN;

    for (let i = 0; i < soCu; i++) {
        await page.mouse.wheel(0, huong * DELTA_CUON);
        await randomSleep(
            GIAN_CACH_CU_MS[0],
            GIAN_CU_MS[1]
        );
    }

    await randomSleep(
        CHO_SAU_CUON_MS[0],
        CHO_SAU_CUON_MS[1]
    );
}

/**
 * @param {import('playwright').Page} page
 */
async function vongLapChupManHinh(page) {
    if (setting.get("dangChay")) return;

    setting.set("dangChay", true);

    try {
        const duLieu = {
            tren: Array(8).fill(null).map(() => []),
            duoi: Array(8).fill(null).map(() => []),
        };

        const demTruot = {
            tren: Array(8).fill(0),
            duoi: Array(8).fill(0),
        };

        let viTri = "tren";

        // Lấy tọa độ giữa màn hình một lần
        const { w, h } = await page.evaluate(() => ({
            w: window.innerWidth,
            h: window.innerHeight,
        }));

        const toaDo = {
            x: Math.round(w / 2),
            y: Math.round(h / 2),
        };

        while (setting.get("isStart")) {
            try {
                // 1. Đọc số giây
                const giayHopLe = await docGiay(page);

                // 2. Đọc bi 8 phòng
                const biCacPhong = await docBan(page);

                // 3. Xử lý dữ liệu theo vị trí hiện tại
                const phongCu = duLieu[viTri];
                const dem = demTruot[viTri];

                const phongMoi = giayHopLe.map((hopLe, i) => {
                    if (hopLe) {
                        dem[i] = 0;
                        return biCacPhong[i];
                    }

                    dem[i]++;

                    return dem[i] >= SO_LAN_TRUOT_DE_XOA
                        ? []
                        : (phongCu[i] || []);
                });

                // 4. Kiểm tra thay đổi
                const coPhongDoi = phongMoi.some(
                    (mangBi, i) =>
                        mangBi.join("") !==
                        (phongCu[i] || []).join("")
                );

                duLieu[viTri] = phongMoi;

                // 5. Cập nhật và tìm phòng đạt
                if (coPhongDoi) {
                    setting.set("phongRoomS", phongMoi);

                    await update_UI_KetQua8Phong(
                        page,
                        phongMoi
                    );

                    const ketQua =
                        TimPhongDat_Util(phongMoi) || [];

                    const danhSach = ketQua
                        .map(phong => ({
                            ...phong,
                            tab: setting.get("tabHienTai"),
                        }))
                        .sort((a, b) => b.uutien - a.uutien);

                    setting.set(
                        "danhSachTimKiemRa",
                        danhSach
                    );

                    // Có phòng đạt thì vào luôn
                    if (danhSach.length >= 1) {
                        setting.set("isStart", false);

                        await xulyVoPhong_Util(
                            page,
                            danhSach
                        );

                        break;
                    }
                }

                // 6. Chuyển vị trí cuộn
                if (viTri === "tren") {
                    // Trên -> dưới
                    await cuon(page, toaDo, 1);
                    viTri = "duoi";

                } else if (BAT_TAB_2) {
                    // Dưới -> chuyển tab
                    const tabHienTai =
                        setting.get("tabHienTai");

                    const tabMoi =
                        tabHienTai === 1 ? 2 : 1;

                    setting.set("tabHienTai", tabMoi);

                    const tab = ToaDoTab.find(
                        t => t.tab === tabMoi
                    );

                    if (tab) {
                        await page.mouse.click(tab.x, tab.y);
                        await randomSleep(410, 450);
                    }

                    viTri = "tren";

                } else {
                    // Chỉ tab 1: dưới -> trên
                    await cuon(page, toaDo, -1);
                    viTri = "tren";
                }

                await randomSleep(222, 333);

            } catch (errLoop) {
                // console.error(
                //     "[VongLapChupManHinh]",
                //     errLoop.message
                // );

                await randomSleep(300, 500);
            }
        }

    } finally {
        setting.set("dangChay", false);
    }
}

module.exports = { vongLapChupManHinh };
