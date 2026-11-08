// src/setupExposeFunctions.js – Đăng ký toàn bộ exposeFunction cho page
"use strict";

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const { createChecker, checkOnce } = require("./util/checker");
const { setupImageFinder } = require("./util/findImageInfo");
const ketQuaListState = require("./State/ketQuaListState");
const { captureItems, saveStateTXT, IMAGES_DIR } = require("./captureState");
const player = require("play-sound")({});
const SOUND_FILE = path.join(__dirname, "..", "tinh.mp3");

/**
 * Đăng ký tất cả exposeFunction vào page.
 * @param {import('playwright').Page} page
 */
async function setupExposeFunctions(page) {
    // ── Chụp ảnh vùng màn hình, lưu file + thêm vào captureItems ──────────
    await page.exposeFunction("doCapture", async ({ name, x, y, width, height }) => {
        try {
            const safeName = name.replace(/[^a-zA-Z0-9_\-]/g, "_");
            const filePath = path.join(IMAGES_DIR, `${safeName}.png`);

            const shotBuf = await page.screenshot({
                path: filePath,
                scale: "css",
                clip: {
                    x: Math.round(x), y: Math.round(y),
                    width: Math.round(width), height: Math.round(height),
                },

            });

            const item = {
                name: safeName,
                x: Math.round(Number(x) * 100) / 100,
                y: Math.round(Number(y) * 100) / 100,
                width: Math.round(Number(width) * 100) / 100,
                height: Math.round(Number(height) * 100) / 100,
            };
            captureItems.push(item);
            saveStateTXT();

            console.log(`📸 Đã chụp: ${filePath}`);
            return { success: true, item: { ...item, imgBase64: `data:image/png;base64,${shotBuf.toString("base64")}` } };
        } catch (err) {
            console.error("❌ doCapture lỗi:", err.message);
            return { success: false, error: err.message };
        }
    });

    // ── Xoá 1 item theo index ──────────────────────────────────────────────
    await page.exposeFunction("deleteCapture", async (index) => {
        try {
            if (index >= 0 && index < captureItems.length) {
                const removed = captureItems.splice(index, 1)[0];
                saveStateTXT();
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

    // ── Copy 1 item theo index, chèn ngay phía dưới ───────────────────────
    await page.exposeFunction("copyCapture", async (index) => {
        try {
            if (index >= 0 && index < captureItems.length) {
                const src = captureItems[index];
                let baseName = src.name.replace(/_copy(\d+)?$/, "");
                let newName = `${src.name}_copy`;
                let count = 1;
                while (captureItems.some(it => it.name === newName) || fs.existsSync(path.join(IMAGES_DIR, `${newName}.png`))) {
                    newName = `${baseName}_copy${count++}`;
                }
                const newItem = { name: newName, x: src.x, y: src.y, width: src.width, height: src.height };
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

    // ── Cập nhật thông số 1 item ───────────────────────────────────────────
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
                    height: Math.round(Number(updated.height) * 100) / 100,
                };
                captureItems[index] = newItem;
                saveStateTXT();
                let imgBase64 = null;
                const filePath = path.join(IMAGES_DIR, `${newItem.name}.png`);
                if (fs.existsSync(filePath))
                    imgBase64 = `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`;
                console.log(`✏️ Đã cập nhật item index ${index}: ${JSON.stringify(newItem)}`);
                return { success: true, item: { ...newItem, imgBase64 } };
            }
            return { success: false, error: "Index không hợp lệ" };
        } catch (err) {
            console.error("❌ updateCapture lỗi:", err.message);
            return { success: false, error: err.message };
        }
    });

    // ── Trả toàn bộ captureItems kèm ảnh base64 cho browser ──────────────
    await page.exposeFunction("getCaptureItems", async () => {
        return captureItems.map(item => {
            let imgBase64 = null;
            try {
                const filePath = path.join(IMAGES_DIR, `${item.name}.png`);
                if (fs.existsSync(filePath))
                    imgBase64 = `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`;
            } catch (_) { }
            return { ...item, imgBase64 };
        });
    });

    // ── Checker: so sánh ảnh thời gian thực ──────────────────────────────
    const checker = createChecker(page, IMAGES_DIR);
    await page.exposeFunction("startChecker", async (item) => {
        try { checker.start(item); return { success: true }; }
        catch (err) { return { success: false, error: err.message }; }
    });
    await page.exposeFunction("stopChecker", async (name) => {
        try { checker.stop(name); return { success: true }; }
        catch (err) { return { success: false, error: err.message }; }
    });

    // ── Di chuyển chuột qua Playwright ───────────────────────────────────
    await page.exposeFunction("moveMouse", async (x, y) => {
        try {
            await page.mouse.move(Math.round(x), Math.round(y));
            return { success: true };
        } catch (err) {
            console.error("❌ moveMouse lỗi:", err.message);
            return { success: false, error: err.message };
        }
    });

    // ── So sánh 1 vùng màn hình, trả name khớp nhất ──────────────────────
    await page.exposeFunction("Fc_checkOnceResult", async ({ x, y, width, height }) => {
        try {
            const result = await checkOnce(page, IMAGES_DIR, x, y, width, height);
            return { success: true, name: result.name, score: result.score };
        } catch (err) {
            console.error("❌ Fc_checkOnceResult lỗi:", err.message);
            return { success: false, error: err.message, name: null, score: 0 };
        }
    });

    // ── Tìm thông tin ảnh từ captureItems theo name ───────────────────────
    await setupImageFinder(page, () => captureItems);

    // ── Lưu kết quả vào ketQuaListState (gọi từ browser) ─────────────────
    await page.exposeFunction("FcSetKetQuaListTable", async (list) => {
        try {
            ketQuaListState.setKetQuaListTable(list);
            return { success: true };
        } catch (err) {
            console.error("❌ FcSetKetQuaListTable lỗi:", err.message);
            return { success: false, error: err.message };
        }
    });

}

module.exports = { setupExposeFunctions };