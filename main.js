const { injectMouseTracker, UI_TieuDiem } = require('./src/injectMouseTracker');
const { UI_TableKiemthu } = require('./src/UI_TableKiemthu');
const { UI_KetQua } = require('./src/UI_KetQua');
const { createChecker, checkOnce } = require('./src/checker');

const { chromium } = require("playwright");
require('dotenv').config();
const fs = require("fs");
const path = require("path");

// =========== STATE – CAPTURE ITEMS ==================
const STATE_FILE = path.join(__dirname, "state.txt");
const IMAGES_DIR = path.join(__dirname, "src", "Images");

let captureItems = []; // [{ name, x, y, width, height }]

// Đảm bảo thư mục Images tồn tại
fs.mkdirSync(IMAGES_DIR, { recursive: true });

function saveStateTXT() {
    try {
        const lines = [];
        lines.push(`captureItems=${JSON.stringify(captureItems)}`);
        fs.writeFileSync(STATE_FILE, lines.join("\n"), "utf8");
        console.log("✅ Đã lưu state.txt");
    } catch (err) {
        console.error("❌ Save TXT lỗi:", err.message);
    }
}

function loadStateTXT() {
    if (!fs.existsSync(STATE_FILE)) return;
    try {
        const content = fs.readFileSync(STATE_FILE, "utf8");
        const getVal = (key) => {
            const m = content.match(new RegExp(`${key}=(.*)`));
            return m ? m[1].trim() : null;
        };
        const raw = getVal("captureItems");
        if (raw) captureItems = JSON.parse(raw);
        console.log(`✅ Đã load state.txt - ${captureItems.length} items`);
    } catch (err) {
        console.error("❌ Load TXT lỗi -> bỏ qua state:", err.message);
    }
}

// =========== MAIN – CHƯƠNG TRÌNH CHÍNH ==================
(async () => {
    // Load state trước khi mở browser
    loadStateTXT();

    const browser = await chromium.launch({
        headless: false,
        args: [
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process"
        ]
    });
    let page = await browser.newPage();
    await page.goto(process.env.X_URL, {
        waitUntil: "networkidle",
        timeout: 15 * 60 * 1000,
    });

    // ── exposeFunction: browser gọi lại Node.js để chụp ảnh ──
    await page.exposeFunction("doCapture", async ({ name, x, y, width, height }) => {
        try {
            const safeName = name.replace(/[^a-zA-Z0-9_\-]/g, "_");
            const filePath = path.join(IMAGES_DIR, `${safeName}.png`);

            const shotBuf = await page.screenshot({
                path: filePath,
                clip: {
                    x: Math.round(x),
                    y: Math.round(y),
                    width: Math.round(width),
                    height: Math.round(height)
                },
            });

            const item = {
                name: safeName,
                x: Math.round(Number(x) * 100) / 100,
                y: Math.round(Number(y) * 100) / 100,
                width: Math.round(Number(width) * 100) / 100,
                height: Math.round(Number(height) * 100) / 100
            };
            captureItems.push(item);
            saveStateTXT();

            console.log(`📸 Đã chụp: ${filePath}`);
            const clientItem = {
                ...item,
                imgBase64: `data:image/png;base64,${shotBuf.toString("base64")}`
            };
            return { success: true, item: clientItem };
        } catch (err) {
            console.error("❌ doCapture lỗi:", err.message);
            return { success: false, error: err.message };
        }
    });

    // ── exposeFunction: xoá 1 item theo index ──
    await page.exposeFunction("deleteCapture", async (index) => {
        try {
            if (index >= 0 && index < captureItems.length) {
                const removed = captureItems.splice(index, 1)[0];
                saveStateTXT();

                // Xoá file ảnh trên đĩa
                const filePath = path.join(IMAGES_DIR, `${removed.name}.png`);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Đã xoá file ảnh: ${filePath}`);
                } else {
                    console.warn(`⚠️ File không tồn tại: ${filePath}`);
                }

                console.log(`🗑️ Đã xoá item: ${removed.name}`);
                return { success: true };
            }
            return { success: false, error: "Index không hợp lệ" };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // ── exposeFunction: copy 1 item theo index và chèn ngay phía dưới ──
    await page.exposeFunction("copyCapture", async (index) => {
        try {
            if (index >= 0 && index < captureItems.length) {
                const src = captureItems[index];

                let baseName = src.name.replace(/_copy(\d+)?$/, "");
                let newName = `${src.name}_copy`;
                let count = 1;
                while (captureItems.some(it => it.name === newName) || fs.existsSync(path.join(IMAGES_DIR, `${newName}.png`))) {
                    newName = `${baseName}_copy${count}`;
                    count++;
                }

                const newItem = {
                    name: newName,
                    x: src.x,
                    y: src.y,
                    width: src.width,
                    height: src.height
                };

                const srcPath = path.join(IMAGES_DIR, `${src.name}.png`);
                const destPath = path.join(IMAGES_DIR, `${newName}.png`);
                let imgBase64 = null;
                if (fs.existsSync(srcPath)) {
                    fs.copyFileSync(srcPath, destPath);
                    imgBase64 = `data:image/png;base64,${fs.readFileSync(destPath).toString("base64")}`;
                    console.log(`📋 Đã copy file ảnh: ${srcPath} -> ${destPath}`);
                }

                const insertIndex = index + 1;
                captureItems.splice(insertIndex, 0, newItem);
                saveStateTXT();

                console.log(`📋 Đã copy item: ${src.name} -> ${newName} tại index ${insertIndex}`);
                return { success: true, item: { ...newItem, imgBase64 }, index: insertIndex };
            }
            return { success: false, error: "Index không hợp lệ" };
        } catch (err) {
            console.error("❌ copyCapture lỗi:", err.message);
            return { success: false, error: err.message };
        }
    });

    // ── exposeFunction: edit thông số 1 item (name, x, y, width, height) ──
    await page.exposeFunction("updateCapture", async (index, updated) => {
        try {
            if (index >= 0 && index < captureItems.length) {
                const oldItem = captureItems[index];
                const safeName = (updated.name || oldItem.name).replace(/[^a-zA-Z0-9_\-]/g, "_");

                if (safeName !== oldItem.name) {
                    const oldPath = path.join(IMAGES_DIR, `${oldItem.name}.png`);
                    const newPath = path.join(IMAGES_DIR, `${safeName}.png`);
                    if (fs.existsSync(oldPath)) {
                        fs.renameSync(oldPath, newPath);
                        console.log(`✏️ Đã đổi tên ảnh: ${oldPath} -> ${newPath}`);
                    }
                }

                const newItem = {
                    name: safeName,
                    x: Math.round(Number(updated.x) * 100) / 100,
                    y: Math.round(Number(updated.y) * 100) / 100,
                    width: Math.round(Number(updated.width) * 100) / 100,
                    height: Math.round(Number(updated.height) * 100) / 100
                };

                captureItems[index] = newItem;
                saveStateTXT();

                let imgBase64 = null;
                const filePath = path.join(IMAGES_DIR, `${newItem.name}.png`);
                if (fs.existsSync(filePath)) {
                    imgBase64 = `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`;
                }

                console.log(`✏️ Đã cập nhật item index ${index}: ${JSON.stringify(newItem)}`);
                return { success: true, item: { ...newItem, imgBase64 } };
            }
            return { success: false, error: "Index không hợp lệ" };
        } catch (err) {
            console.error("❌ updateCapture lỗi:", err.message);
            return { success: false, error: err.message };
        }
    });

    // ── exposeFunction: trả toàn bộ captureItems cho browser khi load ──
    await page.exposeFunction("getCaptureItems", async () => {
        return captureItems.map(item => {
            let imgBase64 = null;
            try {
                const filePath = path.join(IMAGES_DIR, `${item.name}.png`);
                if (fs.existsSync(filePath)) {
                    imgBase64 = `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`;
                }
            } catch (_) { }
            return { ...item, imgBase64 };
        });
    });

    // ── Checker: so sánh ảnh thời gian thực ──
    const checker = createChecker(page, IMAGES_DIR);

    await page.exposeFunction("startChecker", async (item) => {
        try {
            checker.start(item);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    await page.exposeFunction("stopChecker", async (name) => {
        try {
            checker.stop(name);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // ── exposeFunction: di chuyển chuột qua Playwright ──11
    await page.exposeFunction("moveMouse", async (x, y) => {
        try {
            await page.mouse.move(Math.round(x), Math.round(y));
            return { success: true };
        } catch (err) {
            console.error("❌ moveMouse lỗi:", err.message);
            return { success: false, error: err.message };
        }
    });

    // ── exposeFunction: so sánh 1 vùng màn hình, trả name khớp nhất ──
    await page.exposeFunction("checkOnceResult", async ({ x, y, width, height }) => {
        try {
            const result = await checkOnce(page, IMAGES_DIR, x, y, width, height);
            return { success: true, name: result.name, score: result.score };
        } catch (err) {
            console.error("❌ checkOnceResult lỗi:", err.message);
            return { success: false, error: err.message, name: null, score: 0 };
        }
    });

    // GỌI SAU page.goto__________________________
    // await injectMouseTracker(page);
    await UI_TableKiemthu(page);
    await UI_KetQua(page);



    // Tạo overlay nhiều điểm
    // Sảnh 
    // await UI_TieuDiem(page, 320, 380, 6, 6, "sanh-1", "#ff0000");   // đỏ
    // await UI_TieuDiem(page, 640, 380, 6, 6, "sanh-2", "#e83e8c"); // hồng
    // await UI_TieuDiem(page, 950, 380, 6, 6, "sanh-3", "#2bf011"); // cam
    // await UI_TieuDiem(page, 320, 530, 6, 6, "sanh-4", "#ff0000");   // đỏ
    // await UI_TieuDiem(page, 640, 530, 6, 6, "sanh-5", "#e83e8c"); // hồng
    // await UI_TieuDiem(page, 950, 530, 6, 6, "sanh-6", "#2bf011"); // cam

    // await UI_TieuDiem(page, 320, 650, 6, 6, "sanh-7", "#ff0000");   // đỏ
    // await UI_TieuDiem(page, 640, 650, 6, 6, "sanh-8", "#e83e8c"); // hồng
    // await UI_TieuDiem(page, 950, 650, 6, 6, "sanh-9", "#2bf011"); // cam

    //Đồng Xu
    // await UI_TieuDiem(page, 420, 686, 3, 3, "dongxu-1", "#2bf011"); // cam
    // await UI_TieuDiem(page, 464, 686, 3, 3, "dongxu-2", "#ffc107"); // vàng
    // await UI_TieuDiem(page, 508, 686, 3, 3, "dongxu-3", "#fd7e14"); // cam
    // await UI_TieuDiem(page, 550, 686, 3, 3, "dongxu-4", "#ff0000");   // đỏ
    // await UI_TieuDiem(page, 600, 686, 3, 3, "dongxu-5", "#6f42c1"); // tím

    // //Đặt cược

    // await UI_TieuDiem(page, 500, 630, 3, 3, "datcuocXanh", "#007bff"); // xanh dương
    // await UI_TieuDiem(page, 800, 630, 3, 3, "datcuocDo", "#ff0000");   // đỏ
    // await UI_TieuDiem(page, 715, 690, 3, 3, "DatCuocXacNhan", "#2bf011"); // xanh

    // await UI_TieuDiem(page, 1191, 370, 3, 3, "controlroiBan", "#0abbfbff");   // đỏ
})();
// =========== HẾT MAIN – CHƯƠNG TRÌNH CHÍNH ==================
