// src/Util/VongLapChupManHinh.js – Vòng lặp đọc 8 phòng, tìm phòng đạt và vào phòng
// Chụp nửa trên -> cuộn xuống chụp nửa dưới -> cuộn lên ... (chỉ tab 1)
"use strict";

const setting = require("../State/setting");
const { docBan } = require("./DocBi");
const { docGiay } = require("./DocGiay");
const { update_UI_KetQua8Phong } = require("../UI/UI_KetQua8Phong");
const { TimPhongDat_Util } = require("./TimPhongDat_Util");
const { xulyVoPhong_Util } = require("./xulyVoPhong_Util");
const { randomSleep } = require("./Sleep_Util");

const SO_LAN_TRUOT_DE_XOA = 2;

// ── Cấu hình cuộn (giống bản gốc, chỉ rút ngắn thời gian chờ) ───────────────
const DELTA_CUON = 3333;
const SO_CU_XUONG = 4;       // số cú lăn xuống
const SO_CU_LEN = 5;         // số cú lăn lên (dư 1 cho chắc)
const GIAN_CACH_CU_MS = [20, 30];   // nghỉ giữa các cú lăn
const CHO_SAU_CUON_MS = [150, 200]; // chờ 1 lần duy nhất cho màn hình ổn định rồi mới chụp

// Lăn chuột: huong = 1 (xuống) | -1 (lên)
async function cuon(page, toaDo, huong) {
    await page.mouse.move(toaDo.x, toaDo.y);
    const soCu = huong === 1 ? SO_CU_XUONG : SO_CU_LEN;
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
        // Dữ liệu tách riêng cho nửa trên và nửa dưới
        const duLieu = { tren: [], duoi: [] };
        const demTruot = {
            tren: Array(8).fill(0),
            duoi: Array(8).fill(0),
        };
        let viTri = "tren"; // "tren" | "duoi"

        // Lấy kích thước màn hình 1 lần
        const { w, h } = await page.evaluate(() => ({
            w: window.innerWidth,
            h: window.innerHeight,
        }));
        const toaDo = { x: Math.round(w / 2), y: Math.round(h / 2) };

        while (setting.get("isStart")) {
            try {
                // 1. Đọc ô số giây
                const giayHopLe = await docGiay(page);

                // 2. Đọc bi 8 phòng
                const biCacPhong = await docBan(page);

                // 3. Xử lý dữ liệu phòng (theo đúng nửa đang đứng)
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

                // 4. Kiểm tra phòng có thay đổi
                const coPhongDoi = phongMoi.some(
                    (mangBi, i) =>
                        mangBi.join("") !== (phongCu[i] || []).join("")
                );

                duLieu[viTri] = phongMoi;

                // 5. Có thay đổi thì cập nhật UI + tìm phòng đạt
                if (coPhongDoi) {
                    setting.set("phongRoomS", phongMoi);
                    await update_UI_KetQua8Phong(page, phongMoi);

                    const ketQua = TimPhongDat_Util(phongMoi) || [];

                    // Sắp sẵn: ngam to nhất lên đầu, bằng ngam thì chenhLech to hơn
                    const chenhLechHieuLuc = (p) => (p.benUuThe !== p.phe ? p.chenhLech : 0);

                    const danhSach = ketQua
                        .map((phong) => ({ ...phong, tab: 1 }))
                        .sort((a, b) =>
                            (b.ngam - a.ngam) ||
                            (chenhLechHieuLuc(b) - chenhLechHieuLuc(a))
                        );

                    setting.set("danhSachTimKiemRa", danhSach);

                    // Có >= 1 phòng đạt: vào luôn
                    if (danhSach.length >= 1) {
                        setting.set("isStart", false);
                        await xulyVoPhong_Util(page, danhSach);
                        break;
                    }
                }

                // 6. Không có phòng đạt: cuộn sang nửa còn lại rồi chụp tiếp
                await cuon(page, toaDo, viTri === "tren" ? 1 : -1);
                viTri = viTri === "tren" ? "duoi" : "tren";
            } catch (errLoop) {
                // console.error("[VongLapChupManHinh] Lỗi trong nhịp lặp:", errLoop.message);
                await randomSleep(300, 500);
            }
        }

    } finally {
        setting.set("dangChay", false);
    }
}

module.exports = { vongLapChupManHinh };