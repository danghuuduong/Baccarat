// src/Util/VongLapChupManHinh.js – Vòng lặp đọc 8 phòng, tìm phòng đạt và vào phòng
"use strict";

const setting = require("../State/setting");
const { docBan } = require("./DocBi");
const { docGiay } = require("./DocGiay");
const { update_UI_KetQua8Phong } = require("../UI/UI_KetQua8Phong");
const { TimPhongDat_Util } = require("./TimPhongDat_Util");
const { ToaDoTab } = require("../config/RoomConfig");
const { xulyVoPhong_Util } = require("./xulyVoPhong_Util");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Đưa chuột vào giữa màn hình rồi lăn xuống như người: 2 nhịp x 600px = 1200px
async function lanXuongNhuNguoi(page) {
    const { w, h } = await page.evaluate(() => ({
        w: window.innerWidth,
        h: window.innerHeight,
    }));

    await page.mouse.move(w / 2, h / 2);

    const soLan = setting.get("tabHienTai") === 1 ? 4 : 3;
    z
    for (let i = 0; i < soLan; i++) {
        await page.mouse.wheel(0, 3333);
        await sleep(60);
    }
}

/**
 * @param {import('playwright').Page} page
 */
async function vongLapChupManHinh(page) {
    if (setting.get("dangChay")) return;
    setting.set("dangChay", true);
    try {
        const SO_LAN_TRUOT_DE_XOA = 2;
        const demTruot = Array(8).fill(0);
        let viTri = "tren"; // "tren" | "duoi"

        while (setting.get("isStart")) {

            // 1. Đọc ô số giây
            const giayHopLe = await docGiay(page);

            // 2. Đọc bi 8 phòng
            const biCacPhong = await docBan(page);

            // 3. Xử lý dữ liệu phòng
            const phongCu = setting.get("phongRoomS") || [];

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

            // 5. Có thay đổi thì cập nhật + xử lý
            if (coPhongDoi) {
                setting.set("phongRoomS", phongMoi);
                await update_UI_KetQua8Phong(page, phongMoi);

                const tabHienTai = setting.get("tabHienTai");
                const ketQua = TimPhongDat_Util(phongMoi) || [];

                // Lưu kèm tab, sắp sẵn: ngam to nhất lên đầu, bằng ngam thì thep to hơn
                const danhSach = ketQua
                    .map(phong => ({ ...phong, tab: tabHienTai }))
                    .sort((a, b) =>
                        (b.ngam - a.ngam) ||
                        (b.infoTinHieu.thep - a.infoTinHieu.thep)
                    );
                setting.set("danhSachTimKiemRa", danhSach);

                // Có >= 1 phòng đạt: vào luôn, khỏi sang tab khác
                if (danhSach.length >= 1) {
                    setting.set("isStart", false);
                    await xulyVoPhong_Util(page, danhSach);
                    break;
                }

                // Rỗng: clear sạch trước
                if (viTri === "tren") {
                    // chụp xong phần trên không có -> lăn xuống chụp tiếp
                    await lanXuongNhuNguoi(page);
                    viTri = "duoi";
                } else {
                    // chụp xong phần dưới không có -> tab 1 -> tab 2, tab 2 -> về tab 1
                    const tabMoi = tabHienTai === 1 ? 2 : 1;
                    setting.set("tabHienTai", tabMoi);

                    const tab = ToaDoTab.find(t => t.tab === tabMoi);
                    await page.mouse.click(tab.x, tab.y);
                    await sleep(444);
                    viTri = "tren";
                }
            }

            await sleep(444);
        }

    } finally {
        setting.set("dangChay", false);
    }
}

module.exports = { vongLapChupManHinh };