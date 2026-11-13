"use strict";

const setting = require("../State/setting");
const { updateBatDau } = require("../UI/UI_Btn_BatDau");
const { vongLapChupManHinh } = require("../util/VongLapChupManHinh");
const { saveSettingTXT } = require("../TXT/settingState");
const { getToolStats } = require("../util/mongoDB");

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
            const toolName = setting.get("currentToolName") || process.env.TOOL_NAME || "01";

            const patch = {
                TonThat_Max: 0,
                tiSoDuong: 0,
                tiSoAm: 0,
                VSTISO: 0,
                VSTISO_Duong_Max: 0,
                VSTISO_Am_Max: 0,
            };

            // Gọi CSDL để lấy và fill thông số Lãi, Win, Thua mới nhất của Tool vào UI
            if (taiKhoan) {
                const tool = await getToolStats(taiKhoan, toolName);
                if (tool) {
                    patch.profit = Number(tool.profit) || 0;
                    patch.solenhwin = Number(tool.win) || 0;
                    patch.solenhthua = Number(tool.Thua) || 0;
                    console.log(`[Sync] Đã lấy dữ liệu từ MongoDB cho Tool [${toolName}]: Profit=${patch.profit}K, Win=${patch.solenhwin}, Thua=${patch.solenhthua}`);
                }
            }

            setting.set(patch);
            saveSettingTXT();
            console.log("[Config] Reload dữ liệu từ MongoDB thành công & reset tỉ số");
        } catch (err) {
            console.error("❌ Reload dữ liệu lỗi:", err.message);
        }
    };

    await page.exposeFunction("FC_ReloadThongKe", xuLyReloadThongKe);
    await page.exposeFunction("FC_ResetThongKe", xuLyReloadThongKe);

}

module.exports = { ExposeFC_Main };