"use strict";

const fs = require("fs");
const path = require("path");

const STATE_FILE = path.join(__dirname, "..", "..", "state.txt");
const IMAGES_DIR = path.join(__dirname, "..", "Images");

// Đảm bảo thư mục Images tồn tại
fs.mkdirSync(IMAGES_DIR, { recursive: true });

let captureItems = []; // [{ name, x, y, width, height }]

function saveStateTXT() {
    try {
        fs.writeFileSync(STATE_FILE, `captureItems=${JSON.stringify(captureItems)}`, "utf8");
        console.log("✅ Đã lưu state.txt");
    } catch (err) {
        console.error("❌ Save TXT lỗi:", err.message);
    }
}

function loadStateTXT() {
    if (!fs.existsSync(STATE_FILE)) return;
    try {
        const content = fs.readFileSync(STATE_FILE, "utf8");
        const m = content.match(/captureItems=(.*)/);
        if (m) {
            const parsed = JSON.parse(m[1].trim());
            captureItems.splice(0, captureItems.length, ...parsed);
        }
        console.log(`✅ Đã load state.txt - ${captureItems.length} items`);
    } catch (err) {
        console.error("❌ Load TXT lỗi -> bỏ qua state:", err.message);
    }
}

module.exports = { captureItems, saveStateTXT, loadStateTXT, IMAGES_DIR };

