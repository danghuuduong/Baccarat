// checker.js – So khớp mẫu (template matching) bằng opencv.js
// Hợp ảnh mẫu nhỏ (vd 10x10px): chịu được lệch vài px, không cần feature matching.
// Dùng pngjs để decode PNG buffer → RGBA → cv.Mat (opencv-js không có imdecode).

"use strict";

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const cvModule = require("@techstark/opencv-js");

// ─── Hằng số dễ chỉnh ────────────────────────────────────────────────────────
const FPS = 5;           // số lần check mỗi giây
const PAD = 3;           // px mở rộng mỗi phía khi chụp (chịu lệch vài px)
// Điểm giống 0..1 (TM_CCOEFF_NORMED). Hạ xuống nếu khắt, tăng lên nếu nhận nhầm.
const THRESHOLD = 0.85;

// ─── Chờ opencv.js khởi tạo xong (onRuntimeInitialized) ─────────────────────
const cvReadyPromise = (async () => {
    if (cvModule instanceof Promise) {
        return await cvModule;
    }
    if (cvModule.Mat) {
        return cvModule; // đã sẵn sàng ngay
    }
    await new Promise((resolve) => {
        cvModule.onRuntimeInitialized = resolve;
    });
    return cvModule;
})();

let _cv = null;
async function ensureCV() {
    if (_cv) return _cv;
    _cv = await cvReadyPromise;
    return _cv;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Decode PNG buffer → grayscale cv.Mat. Caller phải .delete(). */
function pngBufToGray(cv, buf) {
    const png = PNG.sync.read(buf);
    const rgba = cv.matFromImageData({
        data: new Uint8ClampedArray(png.data),
        width: png.width,
        height: png.height,
    });
    const gray = new cv.Mat();
    try {
        cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);
    } catch (e) {
        gray.delete();
        throw e;
    } finally {
        rgba.delete();
    }
    return gray;
}

function pct(v) { return `${(v * 100).toFixed(1)}%`; }

// ─── Cache ảnh mẫu: tên (không .png) → { mat grayscale, mtime } ──────────────
const imageCache = new Map();

/**
 * Lấy ảnh mẫu theo tên. Tự nạp lại khi file mới xuất hiện hoặc bị ghi đè
 * (so mtime, rất nhẹ). Trả null nếu file không tồn tại.
 */
function loadTemplate(IMAGES_DIR, bname) {
    const file = path.join(IMAGES_DIR, `${bname}.png`);
    const cached = imageCache.get(bname);

    let st;
    try {
        st = fs.statSync(file);
    } catch (_) {
        if (cached) { try { cached.mat.delete(); } catch (_) { } imageCache.delete(bname); }
        return null;
    }
    if (cached && cached.mtime === st.mtimeMs) return cached.mat;

    const mat = pngBufToGray(_cv, fs.readFileSync(file));
    if (cached) { try { cached.mat.delete(); } catch (_) { } }
    imageCache.set(bname, { mat, mtime: st.mtimeMs });
    return mat;
}

function reloadImagesSync(IMAGES_DIR) {
    if (!_cv) throw new Error("opencv chưa sẵn sàng");

    for (const { mat } of imageCache.values()) {
        try { mat.delete(); } catch (_) { }
    }
    imageCache.clear();

    let files = [];
    try { files = fs.readdirSync(IMAGES_DIR); } catch (_) { return; }

    for (const fname of files) {
        if (!fname.toLowerCase().endsWith(".png")) continue;
        try {
            loadTemplate(IMAGES_DIR, path.basename(fname, ".png"));
        } catch (e) {
            console.warn(`[cache] Không đọc được ${fname}:`, e.message);
        }
    }
    console.log(`[cache] Đã nạp ${imageCache.size} ảnh mẫu từ ${IMAGES_DIR}`);
}

// ─── Template matching 1 mẫu trong vùng chụp ─────────────────────────────────
/**
 * @returns {{ score, x, y }} x, y = vị trí góc trên trái của chỗ khớp,
 *          quy đổi về tọa độ thật trong trang (originX/originY = gốc vùng chụp).
 */
function matchOne(cv, scene, tmpl, originX, originY) {
    // Mẫu lớn hơn vùng chụp → không so được
    if (tmpl.cols > scene.cols || tmpl.rows > scene.rows) {
        return { score: 0, x: originX, y: originY };
    }

    const result = new cv.Mat();
    try {
        // Ảnh mẫu phẳng một màu → CCOEFF vô nghĩa (ra 0 hoặc NaN), dùng SQDIFF
        const tm = cv.minMaxLoc(tmpl);
        let mm;
        if (tm.maxVal !== tm.minVal) {
            cv.matchTemplate(scene, tmpl, result, cv.TM_CCOEFF_NORMED);
            mm = cv.minMaxLoc(result);
            if (Number.isFinite(mm.maxVal)) {
                const score = Math.max(0, Math.min(1, mm.maxVal));
                return { score, x: originX + mm.maxLoc.x, y: originY + mm.maxLoc.y };
            }
        }

        cv.matchTemplate(scene, tmpl, result, cv.TM_SQDIFF_NORMED);
        mm = cv.minMaxLoc(result);
        const score = Number.isFinite(mm.minVal)
            ? Math.max(0, Math.min(1, 1 - mm.minVal))
            : 0;
        return { score, x: originX + mm.minLoc.x, y: originY + mm.minLoc.y };
    } finally {
        result.delete();
    }
}

// ─── createChecker ────────────────────────────────────────────────────────────
function createChecker(page, IMAGES_DIR) {
    const running = new Map();

    // Khởi tạo opencv rồi nạp cache; mọi check đều đợi cái này xong
    let ready = ensureCV()
        .then(() => reloadImagesSync(IMAGES_DIR))
        .catch((e) => {
            console.error("[checker] Lỗi khởi tạo opencv:", e.message);
        });

    async function getViewport() {
        const vp = page.viewportSize();
        if (vp) return vp;
        return page.evaluate(() => ({
            width: window.innerWidth,
            height: window.innerHeight,
        }));
    }

    // ── 1 lần check ──────────────────────────────────────────────────────────
    async function runOnce(item) {
        await ready;
        const cv = await ensureCV();
        const { name, x: ox, y: oy, width: ow, height: oh } = item;
        const t0 = Date.now();

        const vp = await getViewport();

        // Vùng chụp mở rộng PAD mỗi phía, chặn âm và tràn viewport
        const cx = Math.max(0, Math.round(ox - PAD));
        const cy = Math.max(0, Math.round(oy - PAD));
        const cx2 = Math.min(vp.width, Math.round(ox + ow + PAD));
        const cy2 = Math.min(vp.height, Math.round(oy + oh + PAD));
        const cw = cx2 - cx;
        const ch = cy2 - cy;
        if (cw <= 0 || ch <= 0) {
            console.log(`[${name}] ❌ vùng chụp nằm ngoài màn hình`);
            return;
        }

        const shotBuf = await page.screenshot({
            clip: { x: cx, y: cy, width: cw, height: ch },
            type: "png",
        });

        let scene = null;
        try {
            scene = pngBufToGray(cv, shotBuf); // chuyển xám MỘT lần

            // ── Chỉ so với ảnh trùng tên ────────────────────────────────────
            const tmpl = loadTemplate(IMAGES_DIR, name);
            if (!tmpl) {
                console.log(`[${name}] ❌ không có ảnh mẫu ${name}.png trong thư mục`);
                return;
            }

            const r = matchOne(cv, scene, tmpl, cx, cy);
            const elapsed = Date.now() - t0;
            if (r.score >= THRESHOLD) {
                const mx = r.x + Math.floor(tmpl.cols / 2); // tâm, dùng để click
                const my = r.y + Math.floor(tmpl.rows / 2);
                console.log(
                    `[${name}] ✅ tìm thấy ${name}` +
                    ` (giống: ${pct(r.score)}, x=${r.x}, y=${r.y}, tâm: ${mx},${my}, ${elapsed}ms)`
                );
            } else {
                console.log(`[${name}] ❌ không tìm thấy ${name} (giống: ${pct(r.score)}, ${elapsed}ms)`);
            }
        } finally {
            if (scene) try { scene.delete(); } catch (_) { }
        }
    }

    // ── Vòng lặp (đợi lần trước xong mới chạy lần sau) ──────────────────────
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
            if (running.get(name)) return;
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

        /** Gọi khi thêm ảnh mới vào IMAGES_DIR mà không muốn restart */
        async reloadImages() {
            await ready;
            await ensureCV();
            reloadImagesSync(IMAGES_DIR);
        },
    };
}

// ─── checkOnce: so sánh 1 vùng với tất cả ảnh mẫu, trả name khớp nhất ────────
/**
 * So sánh vùng (x, y, width, height) với toàn bộ ảnh trong IMAGES_DIR.
 * Trả về { name, score } của ảnh khớp nhất nếu score >= THRESHOLD,
 * ngược lại trả { name: null, score }.
 * Dùng riêng, không phụ thuộc vào createChecker.
 */
async function checkOnce(page, IMAGES_DIR, x, y, width, height) {
    const cv = await ensureCV();
    const vp = page.viewportSize() ?? { width: 1920, height: 1080 };

    const cx = Math.max(0, Math.round(x - PAD));
    const cy = Math.max(0, Math.round(y - PAD));
    const cx2 = Math.min(vp.width, Math.round(x + width + PAD));
    const cy2 = Math.min(vp.height, Math.round(y + height + PAD));
    const cw = cx2 - cx;
    const ch = cy2 - cy;
    if (cw <= 0 || ch <= 0) return { name: null, score: 0 };

    const shotBuf = await page.screenshot({
        clip: { x: cx, y: cy, width: cw, height: ch },
        type: "png",
    });

    let scene = null;
    try {
        scene = pngBufToGray(cv, shotBuf);

        let bestName = null;
        let bestScore = -1;

        // So với tất cả ảnh trong cache
        for (const [bname, { mat: tmpl }] of imageCache.entries()) {
            const r = matchOne(cv, scene, tmpl, cx, cy);
            if (r.score > bestScore) {
                bestScore = r.score;
                bestName = bname;
            }
        }

        // Nếu cache chưa có thì thử load từ thư mục
        if (imageCache.size === 0) {
            let files = [];
            try { files = fs.readdirSync(IMAGES_DIR); } catch (_) { }
            for (const fname of files) {
                if (!fname.toLowerCase().endsWith(".png")) continue;
                const bname = path.basename(fname, ".png");
                try {
                    const tmpl = loadTemplate(IMAGES_DIR, bname);
                    if (!tmpl) continue;
                    const r = matchOne(cv, scene, tmpl, cx, cy);
                    if (r.score > bestScore) { bestScore = r.score; bestName = bname; }
                } catch (_) { }
            }
        }

        if (bestScore >= THRESHOLD) return { name: bestName, score: bestScore };
        return { name: null, score: bestScore };
    } finally {
        if (scene) try { scene.delete(); } catch (_) { }
    }
}

module.exports = { createChecker, checkOnce };