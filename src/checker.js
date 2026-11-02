// checker.js – So sánh ảnh bằng pixel diff (thay pixelmatch)
// Dùng pngjs để đọc PNG, không cần cài thêm thư viện

"use strict";

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const THRESHOLD = 0.75;   // độ giống tối thiểu (85%)
const PIXEL_DELTA = 25;    // ngưỡng khác biệt mỗi kênh màu (0–255)
const FPS = 7;     // lần chạy mỗi giây

// ──────────────────────────────────────────────
//  So sánh 2 PNG buffer → trả về similarity 0..1
// ──────────────────────────────────────────────
function comparePNG(buf1, buf2) {
    let png1, png2;
    try {
        png1 = PNG.sync.read(buf1);
        png2 = PNG.sync.read(buf2);
    } catch (_) {
        return 0;
    }

    if (png1.width !== png2.width || png1.height !== png2.height) return 0;

    const total = png1.width * png1.height;
    if (total === 0) return 0;

    let diff = 0;
    const d1 = png1.data;
    const d2 = png2.data;

    for (let i = 0; i < d1.length; i += 4) {
        const dr = Math.abs(d1[i] - d2[i]);
        const dg = Math.abs(d1[i + 1] - d2[i + 1]);
        const db = Math.abs(d1[i + 2] - d2[i + 2]);
        if (dr > PIXEL_DELTA || dg > PIXEL_DELTA || db > PIXEL_DELTA) diff++;
    }

    return 1 - diff / total;
}

// ──────────────────────────────────────────────
//  Tạo checker gắn với page Playwright
// ──────────────────────────────────────────────
function createChecker(page, IMAGES_DIR) {
    // Map: name → true (đang chạy) | false (đã dừng)
    const running = new Map();

    // ── 1 lần check ──
    async function runOnce(item) {
        const { name, x, y, width, height } = item;

        // Chụp vùng màn hình qua Playwright
        const shotBuf = await page.screenshot({
            clip: { x, y, width, height },
            type: "png",
        });

        // Ưu tiên so với ảnh trùng tên
        const namedPath = path.join(IMAGES_DIR, `${name}.png`);
        if (fs.existsSync(namedPath)) {
            const sim = comparePNG(shotBuf, fs.readFileSync(namedPath));
            if (sim >= THRESHOLD) {
                console.log(`[${name}] ✅ tìm thấy ${name} (giống: ${pct(sim)})`);
                return;
            }
        }

        // So với tất cả ảnh còn lại trong folder
        let bestSim = -1;
        let bestName = null;

        let files = [];
        try { files = fs.readdirSync(IMAGES_DIR); } catch (_) { }

        for (const fname of files) {
            if (!fname.toLowerCase().endsWith(".png")) continue;
            const fbase = path.basename(fname, ".png");
            if (fbase === name) continue; // đã check rồi

            try {
                const sim = comparePNG(shotBuf, fs.readFileSync(path.join(IMAGES_DIR, fname)));
                if (sim > bestSim) { bestSim = sim; bestName = fbase; }
            } catch (_) { }
        }

        if (bestSim >= THRESHOLD) {
            console.log(`[${name}] ⚠️  không tìm thấy ${name}, nhưng tìm thấy ${bestName} (giống: ${pct(bestSim)})`);
        } else {
            console.log(`[${name}] ❌ không tìm thấy gì`);
        }
    }

    function pct(v) { return `${(v * 100).toFixed(1)}%`; }

    // ── Vòng lặp ──
    function loop(item) {
        const { name } = item;
        if (!running.get(name)) return;

        const INTERVAL = Math.round(1000 / FPS);
        const t = Date.now();

        runOnce(item)
            .catch((err) => {
                if (running.get(name)) console.error(`[${name}] Lỗi:`, err.message);
            })
            .finally(() => {
                if (!running.get(name)) return;
                const delay = Math.max(0, INTERVAL - (Date.now() - t));
                setTimeout(() => loop(item), delay);
            });
    }

    return {
        start(item) {
            const { name } = item;
            if (running.get(name)) return; // đang chạy rồi
            running.set(name, true);
            console.log(`▶️  Bắt đầu check: ${name} @ ${FPS}fps`);
            loop(item);
        },

        stop(name) {
            if (running.has(name)) {
                running.set(name, false);
                running.delete(name);
                console.log(`⏹  Đã dừng check: ${name}`);
                return true;
            }
            return false;
        },

        isRunning(name) {
            return running.get(name) === true;
        },
    };
}

module.exports = { createChecker };

