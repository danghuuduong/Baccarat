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
 * @param {number} [params.khoiLuong] - Khối lượng vào lệnh của ván (VD: đánh 20k thì 20)
 * @param {number} [params.phi] - Phí giao dịch của ván
 * @param {number} [params.tut] - Mức tụt so với đỉnh hiện tại (đỉnh - tiền hiện tại)
 * @param {number} [params.tiSo] - Tỉ số hiện tại của bot (bot 1/3/4/5)
 * @param {number} [params.khungB] - Khung biên dưới hiện tại (bot 1/3/4/5)
 * @param {number} [params.khungA] - Khung biên trên hiện tại (bot 1/3/4/5)
 * @param {number} [params.botN] - Bộ đếm nhân hiện tại (bot 2K)
 */
async function pushToolStats({ taiKhoan, toolName, result, profitDelta, khoiLuong, phi, tut, tiSo, khungB, khungA, botN }) {
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
        const kl = Math.round(Number(khoiLuong || 0) * 100) / 100;
        const phiGD = Math.round(Number(phi || 0) * 100) / 100;
        const tutVal = Math.round(Number(tut || 0) * 100) / 100;
        // Trạng thái bot: dùng $set nên chỉ ghi đè khi có giá trị (không ghi undefined lên Mongo)
        const hasTiSo = tiSo !== undefined && tiSo !== null;
        const hasKhung = khungB !== undefined && khungB !== null && khungA !== undefined && khungA !== null;
        const hasBotN = botN !== undefined && botN !== null;

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
                KhoiluongVaoLenh: kl,
                PhiGiaodich: phiGD,
                tut: tutVal,
                // Trạng thái bot: tỉ số và khung (bot 1/3/4/5) hoặc bộ đếm n (bot 2K)
                ...(hasTiSo ? { tiSo: Number(tiSo) } : {}),
                ...(hasKhung ? { khungB: Number(khungB), khungA: Number(khungA) } : {}),
                ...(hasBotN ? { botN: Number(botN) } : {}),
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
                        "tools.$.KhoiluongVaoLenh": kl,
                        "tools.$.PhiGiaodich": phiGD,
                        "tools.$.hoaHongHienTai": hoaHongDelta,
                    },
                    $set: {
                        "tools.$.tut": tutVal,
                        "tools.$.currentWinStreak": curWin,
                        "tools.$.currentLossStreak": curLoss,
                        "tools.$.chuoiThangLienTiepCaoNhat": maxWin,
                        "tools.$.chuoiThuaLienTiepCaoNhat": maxLoss,
                        // Ghi đè trạng thái bot (snapshot hiện tại — không cộng dồn)
                        ...(hasTiSo ? { "tools.$.tiSo": Number(tiSo) } : {}),
                        ...(hasKhung ? { "tools.$.khungB": Number(khungB), "tools.$.khungA": Number(khungA) } : {}),
                        ...(hasBotN ? { "tools.$.botN": Number(botN) } : {}),
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
 * Đẩy trạng thái nội tại của bot (tỉ số, khung hoặc bộ đếm n) lên MongoDB mà KHÔNG cộng trừ tiền hay win/thua
 * Dùng cho các ván ẢO để UI web luôn hiển thị đúng tỉ số và khung theo thời gian thực
 * @param {Object} params
 * @param {string} params.taiKhoan
 * @param {string} params.toolName
 * @param {number} [params.tiSo]
 * @param {number} [params.khungB]
 * @param {number} [params.khungA]
 * @param {number} [params.botN]
 */
async function pushBotState({ taiKhoan, toolName, tiSo, khungB, khungA, botN }) {
    try {
        const database = await getDB();
        if (!database) return false;

        const tk = String(taiKhoan || "").trim();
        const tName = String(toolName || "01").trim();
        if (!tk) return false;

        const hasTiSo = tiSo !== undefined && tiSo !== null;
        const hasKhung = khungB !== undefined && khungB !== null && khungA !== undefined && khungA !== null;
        const hasBotN = botN !== undefined && botN !== null;

        const updateSet = {
            updatedAt: new Date(),
        };
        if (hasTiSo) updateSet["tools.$.tiSo"] = Number(tiSo);
        if (hasKhung) {
            updateSet["tools.$.khungB"] = Number(khungB);
            updateSet["tools.$.khungA"] = Number(khungA);
        }
        if (hasBotN) updateSet["tools.$.botN"] = Number(botN);

        const res = await database.collection("accounts").updateOne(
            { taiKhoan: tk, "tools.toolName": tName },
            { $set: updateSet }
        );

        // Nếu tool chưa có trong account -> thêm mới với các chỉ số ban đầu = 0
        if (res.matchedCount === 0) {
            const newTool = {
                toolName: tName,
                win: 0,
                Thua: 0,
                profit: 0,
                KhoiluongVaoLenh: 0,
                PhiGiaodich: 0,
                tut: 0,
                ...(hasTiSo ? { tiSo: Number(tiSo) } : {}),
                ...(hasKhung ? { khungB: Number(khungB), khungA: Number(khungA) } : {}),
                ...(hasBotN ? { botN: Number(botN) } : {}),
                currentWinStreak: 0,
                currentLossStreak: 0,
                chuoiThangLienTiepCaoNhat: 0,
                chuoiThuaLienTiepCaoNhat: 0,
                hoaHongHienTai: 0,
                tongHoaHongDaThu: 0,
            };
            await database.collection("accounts").updateOne(
                { taiKhoan: tk },
                {
                    $push: { tools: newTool },
                    $set: { updatedAt: new Date() }
                }
            );
        }
        return true;
    } catch (error) {
        console.error("[MongoDB] pushBotState lỗi:", error.message);
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
    pushBotState,
    getToolStats
};