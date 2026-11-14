"use strict";

const setting = require("../State/setting");
const { pushToolStats } = require("./mongoDB");

/**
 * Gửi kết quả ván cược lên MongoDB của account đang đăng nhập
 * @param {"win" | "thua"} result 
 * @param {number} profitDelta 
 * @param {string} [customToolName] - Tự truyền tên tool vào (nếu không truyền sẽ lấy mặc định)
 */
async function syncKetQua(result, profitDelta, customToolName) {
    const currentAccount = setting.get("currentAccount");
    const toolName = customToolName || setting.get("currentToolName") || "01";

    if (!currentAccount || !currentAccount.taiKhoan) {
        console.log("[Sync] Bỏ qua sync: Chưa đăng nhập tài khoản");
        return;
    }

    try {
        await pushToolStats({
            taiKhoan: currentAccount.taiKhoan,
            toolName: toolName,
            result: result,
            profitDelta: profitDelta
        });
    } catch (e) {
        console.error("[Sync] Lỗi khi sync kết quả:", e.message);
    }
}

module.exports = { syncKetQua };
