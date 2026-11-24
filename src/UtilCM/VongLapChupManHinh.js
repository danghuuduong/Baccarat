// src/Util/VongLapChupManHinh.js – Vòng lặp đọc 8 phòng, tìm phòng đạt và vào phòng
"use strict";

const setting = require("../State/setting");
const { docBan } = require("./DocBi");
const { docGiay } = require("./DocGiay");
const { update_UI_KetQua8Phong } = require("../UI/UI_KetQua8Phong");
const { TimPhongDat_Util } = require("./TimPhongDat_Util");
const { ToaDoTab } = require("../config/RoomConfig");
const { xulyVoPhong_Util } = require("./xulyVoPhong_Util");
const { randomSleep } = require("./Sleep_Util");

// true = dùng cả tab 1 và tab 2 | false = chỉ tab 1, chụp xong thì lăn ngược lên
const BAT_TAB_2 = false;

// ── Cấu hình cuộn ───────────────────────────────────────────────────────────
const DELTA_CUON = 3333;
const SO_CU_LEN = 5;                 // dư 1 cho chắc
const GIAN_CACH_CU_MS = [20, 30];    // nghỉ giữa các cú lăn
const CHO_SAU_CUON_MS = [150, 200];  // chờ 1 lần cho màn hình ổn định rồi mới chụp

// huong = 1 (xuống) | -1 (lên)
async function cuon(page, toaDo, huong, soCu) {
    await page.mouse.move(toaDo.x, toaDo.y);
    for (let i = 0; i < soCu; i++) {
        await page.mouse.wheel(0, huong * DELTA_CUON);
        await randomSleep(GIAN_CACH_CU_MS[0], GIAN_CACH_CU_MS[1]);
    }
    await randomSleep(CHO_SAU_CUON_MS[0], CHO_SAU_CUON_MS[1]);
}

/**
 * @param {import('playwright').Page} page
 */
async function vongLapChupManHinh(page) {
    if (setting.get("dangChay")) return;
    setting.set("dangChay", true);
    try {
        const SO_LAN_TRUOT_DE_XOA = 2;

        // Dữ liệu + bộ đếm trượt tách riêng theo từng vị trí (tab + trên/dưới)
        const duLieu = {};
        const demTruotTheoViTri = {};
        let viTri = "tren"; // "tren" | "duoi"

        // Lấy kích thước màn hình 1 lần
        const { w, h } = await page.evaluate(() => ({
            w: window.innerWidth,
            h: window.innerHeight,
        }));
        const toaDo = { x: Math.round(w / 2), y: Math.round(h / 2) };

        while (setting.get("isStart")) {
            try {
                const tabHienTai = setting.get("tabHienTai");
                const khoa = `${tabHienTai}-${viTri}`;
                if (!duLieu[khoa]) duLieu[khoa] = [];
                if (!demTruotTheoViTri[khoa]) demTruotTheoViTri[khoa] = Array(8).fill(0);

                // 1. Đọc ô số giây
                const giayHopLe = await docGiay(page);

                // 2. Đọc bi 8 phòng
                const biCacPhong = await docBan(page);

                // 3. Xử lý dữ liệu phòng
                const phongCu = duLieu[khoa];
                const demTruot = demTruotTheoViTri[khoa];

                const phongMoi = giayHopLe.map((hopLe, i) => {
                    if (hopLe) {
                        demTruot[i] = 0;
                        return biCacPhong[i];
                    }

                    demTruot[i]++;
                    return demTruot[i] >= SO_LAN_TRUOT_DE_XOA
                        ? []
                        : (phongCu[i] || []);
                });

                // 4. Kiểm tra phòng có thay đổi
                const coPhongDoi = phongMoi.some(
                    (mangBi, i) =>
                        mangBi.join("") !== (phongCu[i] || []).join("")
                );

                duLieu[khoa] = phongMoi;

                // 5. Có thay đổi thì cập nhật + xử lý
                if (coPhongDoi) {
                    setting.set("phongRoomS", phongMoi);
                    await update_UI_KetQua8Phong(page, phongMoi);

                    const ketQua = TimPhongDat_Util(phongMoi) || [];

                    // Lưu kèm tab, sắp sẵn: ngam to nhất lên đầu, bằng ngam thì thep to hơn
                    const danhSach = ketQua
                        .map(phong => ({ ...phong, tab: tabHienTai }))
                        .sort((a, b) =>
                            (b.ngam - a.ngam) ||
                            (b.infoTinHieu.thep - a.infoTinHieu.thep)
                        );
                    setting.set("danhSachTimKiemRa", danhSach);

                    // Có >= 1 phòng đạt: vào luôn
                    if (danhSach.length >= 1) {
                        setting.set("isStart", false);
                        await xulyVoPhong_Util(page, danhSach);
                        break;
                    }
                }

                // 6. Mỗi vị trí chỉ đọc 1 lần rồi chuyển, KHÔNG phụ thuộc coPhongDoi
                if (viTri === "tren") {
                    await cuon(page, toaDo, 1, tabHienTai === 1 ? 4 : 3);
                    viTri = "duoi";
                } else if (BAT_TAB_2) {
                    const tabMoi = tabHienTai === 1 ? 2 : 1;
                    setting.set("tabHienTai", tabMoi);

                    const tab = ToaDoTab.find(t => t.tab === tabMoi);
                    await page.mouse.click(tab.x, tab.y);
                    await randomSleep(410, 450);
                    viTri = "tren";
                } else {
                    await cuon(page, toaDo, -1, SO_CU_LEN);
                    viTri = "tren";
                }
            } catch (errLoop) {
                await randomSleep(150, 300);
            }
        }

    } finally {
        setting.set("dangChay", false);
    }
}

module.exports = { vongLapChupManHinh };