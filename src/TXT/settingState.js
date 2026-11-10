"use strict";

const fs = require("fs");
const path = require("path");
const setting = require("../State/setting");

const STATE2_FILE = path.join(__dirname, "..", "..", "state2.txt");

const PERSIST_KEYS = [
    "soVonBanDau",
    "SoTienLonNhatTungSoHuu",
    "profit",
    "solenhwin",
    "solenhthua",
    "solenhwin_Tab1",
    "solenhthua_Tab1",
    "solenhwin_Tab2",
    "solenhthua_Tab2",
    "soChuoiDat",
];

let isInternalUpdating = false;

function saveSettingTXT() {
    try {
        const dataToSave = {};
        for (const k of PERSIST_KEYS) {
            dataToSave[k] = setting.get(k);
        }
        fs.writeFileSync(STATE2_FILE, `settingData=${JSON.stringify(dataToSave)}`, "utf8");
    } catch (err) {
        console.error("❌ Save state2.txt lỗi:", err.message);
    }
}

function loadSettingTXT() {
    if (!fs.existsSync(STATE2_FILE)) {
        saveSettingTXT();
        return;
    }
    try {
        const content = fs.readFileSync(STATE2_FILE, "utf8");
        const m = content.match(/settingData=(.*)/s);
        if (m) {
            const parsed = JSON.parse(m[1].trim());
            // Đảm bảo SoTienLonNhatTungSoHuu >= soVonBanDau
            if (parsed.soVonBanDau !== undefined) {
                if (parsed.SoTienLonNhatTungSoHuu === undefined || parsed.soVonBanDau > parsed.SoTienLonNhatTungSoHuu) {
                    parsed.SoTienLonNhatTungSoHuu = parsed.soVonBanDau;
                }
            }
            isInternalUpdating = true;
            setting.set(parsed);
            isInternalUpdating = false;
            console.log("✅ Đã load state2.txt vào setting:", parsed);
        }
    } catch (err) {
        console.error("❌ Load state2.txt lỗi:", err.message);
    }
}

// Lắng nghe thay đổi của setting để tự động lưu và cập nhật SoTienLonNhatTungSoHuu
setting.subscribe((state, patch) => {
    if (isInternalUpdating) return;

    // Tự động cập nhật SoTienLonNhatTungSoHuu nếu vốn vượt kỷ lục
    if (patch.soVonBanDau !== undefined) {
        const currentVon = state.soVonBanDau;
        const maxVon = state.SoTienLonNhatTungSoHuu || 0;
        if (currentVon > maxVon) {
            isInternalUpdating = true;
            setting.set("SoTienLonNhatTungSoHuu", currentVon);
            isInternalUpdating = false;
        }
    }

    // Kiểm tra xem có trường nào trong PERSIST_KEYS thay đổi không
    const shouldSave = PERSIST_KEYS.some((k) => patch[k] !== undefined);
    if (shouldSave) {
        saveSettingTXT();
    }
});

module.exports = { saveSettingTXT, loadSettingTXT, STATE2_FILE };

