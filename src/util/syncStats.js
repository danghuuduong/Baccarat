"use strict";

const setting = require("../State/setting");
const { pushToolStats, pushBotState, pushVanStats } = require("./mongoDB");
const { sleep } = require("./Sleep_Util");

/**
 * Gửi kết quả ván cược lên MongoDB của account đang đăng nhập
 * @param {"win" | "thua"} result 
 * @param {number} profitDelta 
 * @param {string} [toolNameTruyenVao] Không truyền thì dùng toolName mặc định
 * @param {{khoiLuong?: number, phi?: number, tut?: number, tiSo?: number, khungB?: number, khungA?: number, botN?: number}} [extra]
 *   khoiLuong: Khối lượng vào lệnh, phi: phí giao dịch, tut: mức tụt đỉnh,
 *   tiSo: tỉ số hiện tại của bot (bot 1/3/4/5), khungB/khungA: khung biên dưới/trên,
 *   botN: bộ đếm nhân của bot 2K
 */
async function syncKetQua(result, profitDelta, toolNameTruyenVao, extra = {}) {
    const currentAccount = setting.get("currentAccount");
    const toolName = toolNameTruyenVao || setting.get("currentToolName") || "01";

    if (!currentAccount || !currentAccount.taiKhoan) {
        console.log("[Sync] Bỏ qua sync: Chưa đăng nhập tài khoản");
        return;
    }

    try {
        await pushToolStats({
            taiKhoan: currentAccount.taiKhoan,
            toolName: toolName,
            result: result,
            profitDelta: profitDelta,
            khoiLuong: Number(extra && extra.khoiLuong) || 0,
            phi: Number(extra && extra.phi) || 0,
            tut: Number(extra && extra.tut) || 0,
            // Trạng thái bot: tỉ số và khung (bot 1/3/4/5) hoặc bộ đếm n (bot 2K)
            tiSo: extra && extra.tiSo !== undefined ? Number(extra.tiSo) : undefined,
            khungB: extra && extra.khungB !== undefined ? Number(extra.khungB) : undefined,
            khungA: extra && extra.khungA !== undefined ? Number(extra.khungA) : undefined,
            botN: extra && extra.botN !== undefined ? Number(extra.botN) : undefined,
            cycleProfit: extra && extra.cycleProfit !== undefined ? Number(extra.cycleProfit) : undefined,
        });
    } catch (e) {
        console.error("[Sync] Lỗi khi sync kết quả:", e.message);
    }
}

/**
 * Gửi trạng thái bot (tỉ số, khung hoặc bộ đếm n) lên MongoDB
 * Dùng cho các ván ẢO (không cộng dồn tiền/win/loss, chỉ ghi đè snapshot tỉ số & khung)
 * @param {string} toolNameTruyenVao 
 * @param {{tiSo?: number, khungB?: number, khungA?: number, botN?: number, cycleProfit?: number}} [extra]
 */
async function syncTrangThaiBot(toolNameTruyenVao, extra = {}) {
    const currentAccount = setting.get("currentAccount");
    const toolName = toolNameTruyenVao || setting.get("currentToolName") || "01";

    if (!currentAccount || !currentAccount.taiKhoan) return;

    try {
        await pushBotState({
            taiKhoan: currentAccount.taiKhoan,
            toolName: toolName,
            tiSo: extra && extra.tiSo !== undefined ? Number(extra.tiSo) : undefined,
            khungB: extra && extra.khungB !== undefined ? Number(extra.khungB) : undefined,
            khungA: extra && extra.khungA !== undefined ? Number(extra.khungA) : undefined,
            botN: extra && extra.botN !== undefined ? Number(extra.botN) : undefined,
            cycleProfit: extra && extra.cycleProfit !== undefined ? Number(extra.cycleProfit) : undefined,
        });
    } catch (e) {
        console.error("[Sync] Lỗi khi sync trạng thái bot:", e.message);
    }
}

async function syncKetQuaBatch(items, vanId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`) {
    const currentAccount = setting.get("currentAccount");
    if (!currentAccount || !currentAccount.taiKhoan) return false;
    if (!items || items.length === 0) return true;

    for (let lan = 1; lan <= 3; lan++) {
        const ok = await pushVanStats({ taiKhoan: currentAccount.taiKhoan, vanId, items });
        if (ok) return true;
        await sleep(500 * lan);
    }
    console.error("[Sync] Gửi kết quả ván thất bại sau 3 lần:", vanId);
    return false;
}


module.exports = { syncKetQua, syncTrangThaiBot, syncKetQuaBatch };