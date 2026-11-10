"use strict";

const setting = require("../State/setting");
const { updateBatDau } = require("../UI/UI_Btn_BatDau");
const { vongLapChupManHinh } = require("../Util/VongLapChupManHinh");

/**
 * Đăng ký tất cả exposeFunction vào page.
 * @param {import('playwright').Page} page
 */
async function ExposeFC_Main(page) {

    await page.exposeFunction("FC_BatDau", async () => {
        setting.set("danhSachTimKiemRa", []);
        setting.set("tabHienTai", 1);
        setting.set("isRunButon", !setting.get("isRunButon"));

        // Xanh
        setting.set("isStart", setting.get("isRunButon")); // kích hoạt vòng lặp

        const isRunButon = setting.get("isRunButon");
        const isStart = setting.get("isStart");

        await updateBatDau(page, {
            text: isRunButon ? "Dừng Lại" : "Bắt đầu",
            isActive: isRunButon
        });

        if (isStart) vongLapChupManHinh(page);
    });

    await page.exposeFunction("FC_CapNhatSoChuoiDat", async (val) => {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num >= 0 && num <= 10) {
            if (setting.get("soChuoiDat") !== num) {
                setting.set("soChuoiDat", num);
                console.log(`[Config] Cập nhật soChuoiDat = ${num}`);
            }
        }
    });
}

module.exports = { ExposeFC_Main };