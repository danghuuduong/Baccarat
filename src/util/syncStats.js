"use strict";

const setting = require("../State/setting");
const { pushToolStats } = require("./mongoDB");

/**
 * Gửi kết quả ván cược lên MongoDB của account đang đăng nhập
 * @param {"win" | "thua"} result 
 * @param {number} profitDelta 
 * @param {string} [toolNameTruyenVao] Không truyền thì dùng toolName mặc định
 * @param {{khoiLuong?: number, phi?: number, tut?: number}} [extra] Khối lượng vào lệnh, phí giao dịch và mức tụt đỉnh của ván
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
            tut: Number(extra && extra.tut) || 0
        });
    } catch (e) {
        console.error("[Sync] Lỗi khi sync kết quả:", e.message);
    }
}

module.exports = { syncKetQua };