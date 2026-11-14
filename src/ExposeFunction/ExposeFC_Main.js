"use strict";

const setting = require("../State/setting");
const { updateBatDau } = require("../UI/UI_Btn_BatDau");
const { vongLapChupManHinh } = require("../util/VongLapChupManHinh");
const { saveSettingTXT } = require("../TXT/settingState");
const { getToolStats } = require("../util/mongoDB");
const { showStats } = require("../UI/UI_InGame");

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

    await page.exposeFunction("FC_CapNhatVon", async (val) => {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0) {
            if (setting.get("soVonBanDau") !== num) {
                setting.set("soVonBanDau", num);
                console.log(`[Config] Cập nhật soVonBanDau = ${num}`);
            }
        }
    });

    await page.exposeFunction("FC_CapNhatMax", async (val) => {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0) {
            if (setting.get("SoTienLonNhatTungSoHuu") !== num) {
                setting.set("SoTienLonNhatTungSoHuu", num);
                console.log(`[Config] Cập nhật SoTienLonNhatTungSoHuu = ${num}`);
            }
        }
    });
    const xuLyReloadThongKe = async () => {
        try {
            const currentAccount = setting.get("currentAccount");
            const taiKhoan = currentAccount?.taiKhoan;
            const toolDCA = process.env.TOOL_NAME || "App-02-DCA";
            const toolSW = process.env.TOOL_NAME2 || "App-03-SW";

            const patch = {
                TonThat_Max: 0,
                TonThat_Max_DCA: 0,
                TonThat_Max_SW: 0,
                tiSoDuong: 0,
                tiSoAm: 0,
                VSTISO: 0,
                VSTISO_Duong_Max: 0,
                VSTISO_Am_Max: 0,
                bcr: 0,
                bcrSauNhat: 0,
                laiChuKy: 0,
                bcr_sw: 0,
            };

            // Gọi CSDL để lấy và fill thông số Lãi, Win, Thua của cả 2 BOT vào UI
            if (taiKhoan) {
                // 1. BOT 02: DCA
                const statsDCA = await getToolStats(taiKhoan, toolDCA);
                if (statsDCA) {
                    const profitDCA = Number(statsDCA.profit) || 0;
                    const winDCA = Number(statsDCA.win) || 0;
                    const thuaDCA = Number(statsDCA.Thua) || 0;

                    patch.profit = profitDCA;
                    patch.profit_DCA = profitDCA;
                    patch.solenhwin = winDCA;
                    patch.solenhwin_DCA = winDCA;
                    patch.solenhthua = thuaDCA;
                    patch.solenhthua_DCA = thuaDCA;
                    console.log(`[Sync] Đã lấy MongoDB cho BOT DCA [${toolDCA}]: Profit=${profitDCA}K, Win=${winDCA}, Thua=${thuaDCA}`);
                }

                // 2. BOT 03: SW
                const statsSW = await getToolStats(taiKhoan, toolSW);
                if (statsSW) {
                    const profitSW = Number(statsSW.profit) || 0;
                    const winSW = Number(statsSW.win) || 0;
                    const thuaSW = Number(statsSW.Thua) || 0;

                    patch.profit_SW = profitSW;
                    patch.solenhwin_SW = winSW;
                    patch.solenhthua_SW = thuaSW;
                    console.log(`[Sync] Đã lấy MongoDB cho BOT SW [${toolSW}]: Profit=${profitSW}K, Win=${winSW}, Thua=${thuaSW}`);
                }
            } else {
                console.warn("[Sync] Chưa có currentAccount để reload từ MongoDB");
            }

            setting.set(patch);
            saveSettingTXT();

            // Cập nhật ngay lập tức UI trên trình duyệt
            showStats(page, {
                soVonBanDau_DCA: setting.get("soVonBanDau_DCA"),
                SoTienLonNhatTungSoHuu_DCA: setting.get("SoTienLonNhatTungSoHuu_DCA"),
                TonThat_Max_DCA: setting.get("TonThat_Max_DCA"),
                profit_DCA: setting.get("profit_DCA"),
                solenhwin_DCA: setting.get("solenhwin_DCA"),
                solenhthua_DCA: setting.get("solenhthua_DCA"),
                bcr: setting.get("bcr"),
                bcrSauNhat: setting.get("bcrSauNhat"),
                laiChuKy: setting.get("laiChuKy"),

                soVonBanDau_SW: setting.get("soVonBanDau_SW"),
                SoTienLonNhatTungSoHuu_SW: setting.get("SoTienLonNhatTungSoHuu_SW"),
                TonThat_Max_SW: setting.get("TonThat_Max_SW"),
                profit_SW: setting.get("profit_SW"),
                solenhwin_SW: setting.get("solenhwin_SW"),
                solenhthua_SW: setting.get("solenhthua_SW"),
                bcr_sw: setting.get("bcr_sw"),

                soChuoiDat: setting.get("soChuoiDat"),
                TonThat_Max: setting.get("TonThat_Max"),
                tiSoDuong: setting.get("tiSoDuong"),
                tiSoAm: setting.get("tiSoAm"),
                VSTISO: setting.get("VSTISO"),
                VSTISO_Duong_Max: setting.get("VSTISO_Duong_Max"),
                VSTISO_Am_Max: setting.get("VSTISO_Am_Max"),
            });

            console.log("[Config] Reload dữ liệu từ MongoDB thành công & cập nhật UI");
        } catch (err) {
            console.error("❌ Reload dữ liệu lỗi:", err.message);
        }
    };

    await page.exposeFunction("FC_ReloadThongKe", xuLyReloadThongKe);
    await page.exposeFunction("FC_ResetThongKe", xuLyReloadThongKe);

}

module.exports = { ExposeFC_Main };