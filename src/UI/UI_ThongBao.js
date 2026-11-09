// src/UI_ThongBao.js – Thông báo nổi (Toast Stack): kính mờ + vạch màu + thanh thời gian
"use strict";

const fs = require("fs");
const path = require("path");

const CSS_PATH = path.join(__dirname, "..", "CSS", "UI_ThongBao.css");
let cachedCss = null;
function getCss() {
    if (!cachedCss) cachedCss = fs.readFileSync(CSS_PATH, "utf8");
    return cachedCss;
}

/**
 * Hiển thị thông báo nổi ở giữa màn hình, xếp chồng lên đầu các thông báo cũ.
 * @param {import('playwright').Page} page
 * @param {string}  message           - Nội dung thông báo
 * @param {number}  [durationMs=3000] - Thời gian tự ẩn (ms). Dùng 999_999 để "vô hạn"
 * @param {string}  [color]           - Màu chủ đạo (vạch trái, viền, thanh thời gian)
 * @param {string}  [top]             - CSS top của container (mặc định "35%")
 */
function showThongBao(page, message, durationMs = 3000, color = "#fbbf24", top = "23%") {
    if (!page) return;
    const cssText = getCss();
    page.evaluate(({ text, duration, color, top, cssText }) => {
        // 0. Chèn CSS 1 lần
        let st = document.getElementById("ui-thongbao-style");
        if (!st) {
            st = document.createElement("style");
            st.id = "ui-thongbao-style";
            st.textContent = cssText;
            document.head.appendChild(st);
        } else if (st.textContent !== cssText) {
            st.textContent = cssText;
        }

        // 1. Tạo hoặc lấy container dùng chung
        let container = document.getElementById("ui-popup-thongbao-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "ui-popup-thongbao-container";
            container.style.position = "fixed";
            container.style.pointerEvents = "none";
            document.body.appendChild(container);
        }
        container.style.top = top;

        // 2. Tối đa 4 thông báo cùng lúc (xoá cái cũ nhất ở dưới cùng)
        while (container.children.length >= 4) {
            const oldest = container.lastElementChild;
            if (!oldest) break;
            if (oldest._timerId) clearTimeout(oldest._timerId);
            container.removeChild(oldest);
        }

        // 3. Tạo thông báo mới
        const isInfinite = duration >= 999_999;
        const box = document.createElement("div");
        box.className = "ui-tb" + (isInfinite ? " waiting" : "");
        box.style.setProperty("--c", color);
        if (duration >= 100_000) {
            box.dataset.isWaiting = "true"; // để cancelThongBao tìm
        }

        const label = document.createElement("span");
        label.textContent = text;

        const bar = document.createElement("div");
        bar.className = "ui-tb-bar";
        const fill = document.createElement("div");
        fill.className = "ui-tb-fill";
        if (!isInfinite) fill.style.animationDuration = duration + "ms";
        bar.appendChild(fill);

        box.appendChild(label);
        box.appendChild(bar);

        // 4. Xếp lên đầu, đẩy thông báo cũ xuống
        container.prepend(box);

        // Hàm xoá mượt
        function removeBox() {
            if (box._timerId) {
                clearTimeout(box._timerId);
                box._timerId = null;
            }
            box.classList.add("ui-tb-out");
            setTimeout(() => {
                if (box.parentNode) box.parentNode.removeChild(box);
            }, 320);
        }
        box._removeFn = removeBox;

        // Tự ẩn sau duration (trừ thông báo vô hạn)
        if (!isInfinite) {
            box._timerId = setTimeout(removeBox, duration);
        }
    }, { text: message, duration: durationMs, color, top, cssText }).catch(() => { });
}

/**
 * Tắt thông báo đang chờ / đang hiện (ưu tiên thông báo chờ mở bài vô hạn).
 * @param {import('playwright').Page} page
 */
function cancelThongBao(page) {
    if (!page) return;
    page.evaluate(() => {
        const container = document.getElementById("ui-popup-thongbao-container");
        if (!container) return;

        // 1. Ưu tiên tắt thông báo chờ mở bài
        const waitingItem = container.querySelector('[data-is-waiting="true"]');
        if (waitingItem && typeof waitingItem._removeFn === "function") {
            waitingItem._removeFn();
            return;
        }

        // 2. Không có thì tắt thông báo mới nhất trên đầu
        const first = container.firstElementChild;
        if (first && typeof first._removeFn === "function") {
            first._removeFn();
        }
    }).catch(() => { });
}

module.exports = { showThongBao, cancelThongBao };