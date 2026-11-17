"use strict";

const dns = require("dns");
try {
    // Ép Node.js phân giải qua Google/Cloudflare DNS để tránh lỗi querySrv ECONNREFUSED trên một số mạng/máy
    dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
    // Bỏ qua nếu môi trường không hỗ trợ
}

const { MongoClient } = require("mongodb");
require("dotenv").config();

let client = null;
let db = null;

async function getDB() {
    if (db) return db;
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("[MongoDB] Lỗi: Chưa cấu hình MONGODB_URI trong file .env!");
        return null;
    }

    try {
        if (!client) {
            client = new MongoClient(uri);
            await client.connect();
            console.log("[MongoDB] Kết nối MongoDB thành công!");
        }
        db = client.db();
        return db;
    } catch (error) {
        console.error("[MongoDB] Lỗi kết nối MongoDB:", error.message);
        return null;
    }
}

/**
 * Xác thực tài khoản đăng nhập cho Tool Baccarat
 * @param {string} taiKhoan 
 * @param {string} pass 
 */
async function verifyLogin(taiKhoan, pass) {
    try {
        const database = await getDB();
        if (!database) {
            return { success: false, message: "Không thể kết nối đến máy chủ CSDL!" };
        }

        const tk = String(taiKhoan || "").trim();
        const mk = String(pass || "").trim();

        if (!tk || !mk) {
            return { success: false, message: "Vui lòng nhập đầy đủ tài khoản và mật khẩu!" };
        }

        const account = await database.collection("accounts").findOne({ taiKhoan: tk });

        if (!account) {
            return { success: false, message: "Tài khoản không tồn tại trên hệ thống!" };
        }

        if (account.pass !== mk) {
            return { success: false, message: "Mật khẩu không chính xác!" };
        }

        return {
            success: true,
            account: {
                id: account._id.toString(),
                name: account.name || account.taiKhoan,
                taiKhoan: account.taiKhoan,
                profitHoaHongDaGhiNhan: account.profitHoaHongDaGhiNhan || 0,
                tools: Array.isArray(account.tools) ? account.tools : []
            }
        };
    } catch (error) {
        console.error("[MongoDB] verifyLogin lỗi:", error.message);
        return { success: false, message: "Lỗi hệ thống: " + error.message };
    }
}

/**
 * Đẩy thông số thắng/thua & profit của tool lên MongoDB
 * @param {Object} params
 * @param {string} params.taiKhoan - Tên tài khoản
 * @param {string} params.toolName - Mã tool (VD: "01", "02")
 * @param {"win" | "thua"} params.result - Kết quả ván cược
 * @param {number} params.profitDelta - Tiền thắng hoặc thua (+lai hoặc -sotienuoc)
 */
async function pushToolStats({ taiKhoan, toolName, result, profitDelta }) {
    try {
        const database = await getDB();
        if (!database) {
            console.error("[MongoDB] pushToolStats lỗi: Chưa kết nối DB");
            return false;
        }

        const tk = String(taiKhoan || "").trim();
        const tName = String(toolName || "01").trim();
        const isWin = result === "win";
        const isThua = result === "thua";
        const delta = Math.round(Number(profitDelta || 0) * 100) / 100;

        if (!tk) {
            console.error("[MongoDB] pushToolStats lỗi: Thiếu tài khoản");
            return false;
        }

        const account = await database.collection("accounts").findOne({ taiKhoan: tk });
        if (!account) {
            console.error(`[MongoDB] Không tìm thấy tài khoản: ${tk}`);
            return false;
        }

        const phanTram = Number(account.phanTramChiuThue ?? 50);
        const hoaHongDelta = Math.round(delta * (phanTram / 100) * 100) / 100;

        const tools = Array.isArray(account.tools) ? account.tools : [];
        const existingTool = tools.find((t) => String(t.toolName) === tName);

        if (!existingTool) {
            const curWin = isWin ? 1 : 0;
            const curLoss = isThua ? 1 : 0;
            const newTool = {
                toolName: tName,
                win: isWin ? 1 : 0,
                Thua: isThua ? 1 : 0,
                profit: delta,
                currentWinStreak: curWin,
                currentLossStreak: curLoss,
                chuoiThangLienTiepCaoNhat: curWin,
                chuoiThuaLienTiepCaoNhat: curLoss,
                hoaHongHienTai: hoaHongDelta,
                tongHoaHongDaThu: 0,
            };

            await database.collection("accounts").updateOne(
                { taiKhoan: tk },
                {
                    $push: { tools: newTool },
                    $set: { updatedAt: new Date() }
                }
            );
            console.log(`[MongoDB] Đã thêm Tool [${tName}] cho ${tk} | Hoa Hồng: ${hoaHongDelta > 0 ? `+${hoaHongDelta}` : hoaHongDelta}K`);
        } else {
            let curWin = Number(existingTool.currentWinStreak) || 0;
            let curLoss = Number(existingTool.currentLossStreak) || 0;
            let maxWin = Number(existingTool.chuoiThangLienTiepCaoNhat) || 0;
            let maxLoss = Number(existingTool.chuoiThuaLienTiepCaoNhat) || 0;

            if (isWin) {
                curWin += 1;
                curLoss = 0;
                if (curWin > maxWin) maxWin = curWin;
            } else if (isThua) {
                curLoss += 1;
                curWin = 0;
                if (curLoss > maxLoss) maxLoss = curLoss;
            }

            await database.collection("accounts").updateOne(
                { taiKhoan: tk, "tools.toolName": tName },
                {
                    $inc: {
                        "tools.$.win": isWin ? 1 : 0,
                        "tools.$.Thua": isThua ? 1 : 0,
                        "tools.$.profit": delta,
                        "tools.$.hoaHongHienTai": hoaHongDelta,
                    },
                    $set: {
                        "tools.$.currentWinStreak": curWin,
                        "tools.$.currentLossStreak": curLoss,
                        "tools.$.chuoiThangLienTiepCaoNhat": maxWin,
                        "tools.$.chuoiThuaLienTiepCaoNhat": maxLoss,
                        updatedAt: new Date()
                    }
                }
            );
            // console.log(`[MongoDB] Cập nhật Tool [${tName}] (${result}, ${delta}K) | Hoa Hồng: ${hoaHongDelta > 0 ? `+${hoaHongDelta}` : hoaHongDelta}K`);
        }

        return true;
    } catch (error) {
        console.error("[MongoDB] pushToolStats lỗi:", error.message);
        return false;
    }
}

/**
 * Lấy thông số mới nhất của Tool từ MongoDB
 * @param {string} taiKhoan 
 * @param {string} toolName 
 */
async function getToolStats(taiKhoan, toolName) {
    try {
        const database = await getDB();
        if (!database) return null;
        const tk = String(taiKhoan || "").trim();
        const tName = String(toolName || "01").trim();
        const account = await database.collection("accounts").findOne({ taiKhoan: tk });
        if (!account) return null;
        const tools = Array.isArray(account.tools) ? account.tools : [];
        const tool = tools.find((t) => String(t.toolName) === tName);
        return tool || null;
    } catch (error) {
        console.error("[MongoDB] getToolStats lỗi:", error.message);
        return null;
    }
}

module.exports = {
    getDB,
    verifyLogin,
    pushToolStats,
    getToolStats
};
