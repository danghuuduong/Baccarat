// src/UI_ThongBao.js – Thông báo nổi (Toast Stack): kính mờ + vạch màu + thanh thời gian
"use strict";

/**
 * Hiển thị thông báo nổi ở giữa màn hình, xếp chồng lên đầu các thông báo cũ.
 * @param {import('playwright').Page} page
 * @param {string}  message           - Nội dung thông báo
 * @param {number}  [durationMs=3000] - Thời gian tự ẩn (ms). Dùng 999_999 để "vô hạn"
 * @param {string}  [color]           - Màu chủ đạo (vạch trái, viền, thanh thời gian)
 * @param {string}  [top]             - CSS top của container (mặc định "35%")
 */
function showThongBao(page, message, durationMs = 3000, color = "#fbbf24", top = "20%") {
    if (!page) return;
    page.evaluate(({ text, duration, color, top }) => {
        // 0. Chèn CSS 1 lần
        if (!document.getElementById("ui-thongbao-style")) {
            const st = document.createElement("style");
            st.id = "ui-thongbao-style";
            st.textContent = `
                .ui-tb {
                    --c: #fbbf24;
                    position: relative;
                    overflow: hidden;
                    padding: 11px 26px 14px 22px;
                    border-radius: 12px;
                    background: rgba(15, 23, 42, 0.7);
                    -webkit-backdrop-filter: blur(14px) saturate(160%);
                    backdrop-filter: blur(14px) saturate(160%);
                    border: 2px solid color-mix(in srgb, var(--c) 45%, transparent);
                    box-shadow:
                        0 10px 30px rgba(0, 0, 0, 0.45),
                        0 0 18px color-mix(in srgb, var(--c) 25%, transparent),
                        inset 0 2px 0 rgba(255, 255, 255, 0.5);
                    color: #f8fafc;
                    font: 600 14px/1.3 monospace;
                    letter-spacing: 0.3px;
                    text-align: center;
                    white-space: nowrap;
                    max-height: 90px;
                    pointer-events: none;
                    animation: ui-tb-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) backwards;
                    transition: opacity .3s ease, transform .3s ease, max-height .3s ease,
                                padding .3s ease, margin .3s ease, border-width .3s ease;
                }
                /* Vạch màu bên trái */
                .ui-tb::before {
                    content: "";
                    position: absolute;
                    left: 0; top: 0; bottom: 0;
                    width: 4px;
                    background: var(--c);
                    box-shadow: 0 0 10px var(--c);
                }
                /* Thanh thời gian ở đáy */
                .ui-tb-bar {
                    position: absolute;
                    left: 0; right: 0; bottom: 0;
                    height: 6px;
                    overflow: hidden;
                    background: rgba(255, 255, 255, 0.09);
                }
                .ui-tb-fill {
                    height: 100%;
                    width: 100%;
                    background: var(--c);
                    transform-origin: left;
                    animation: ui-tb-shrink linear forwards;
                }
                /* Thông báo chờ (vô hạn): thanh sáng chạy qua lại */
                .ui-tb.waiting .ui-tb-fill {
                    width: 35%;
                    border-radius: 3px;
                    animation: ui-tb-slide 1.2s ease-in-out infinite;
                }
                /* Biến mất */
                .ui-tb.ui-tb-out {
                    opacity: 0;
                    transform: translateY(-10px) scale(0.96);
                    max-height: 0;
                    padding-top: 0;
                    padding-bottom: 0;
                    margin-bottom: -8px;
                    border-width: 0;
                }
                @keyframes ui-tb-in {
                    from { opacity: 0; transform: translateY(-16px) scale(0.94); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes ui-tb-shrink {
                    from { transform: scaleX(1); }
                    to   { transform: scaleX(0); }
                }
                @keyframes ui-tb-slide {
                    from { transform: translateX(-100%); }
                    to   { transform: translateX(290%); }
                }
            `;
            document.head.appendChild(st);
        }

        // 1. Tạo hoặc lấy container dùng chung
        let container = document.getElementById("ui-popup-thongbao-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "ui-popup-thongbao-container";
            Object.assign(container.style, {
                position: "fixed",
                top: top,
                right: "0%",
                // transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                zIndex: "2147483647",
                pointerEvents: "none",
                width: "max-content",
                maxWidth: "90vw",
            });
            document.body.appendChild(container);
        } else {
            container.style.top = top;
        }

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
    }, { text: message, duration: durationMs, color, top }).catch(() => { });
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