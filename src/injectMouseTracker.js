// src/injectMouseTracker.js – Theo dõi toạ độ chuột thời gian thực (hỗ trợ cả iframe & iframe load động)
"use strict";

async function injectMouseTracker(page) {
    let off = null; // { dx, dy } = screen - viewport của trang chính

    await page.exposeBinding("__mouseReport", async ({ frame }, sx, sy, cx, cy) => {
        try {
            if (frame === page.mainFrame()) {
                off = { dx: sx - cx, dy: sy - cy }; // hiệu chỉnh
            } else if (off) {
                await page.mainFrame().evaluate(
                    ([x, y]) => window.__showCoord && window.__showCoord(x, y),
                    [sx - off.dx, sy - off.dy]
                );
            }
        } catch (_) { }
    });

    const trackerScript = () => {
        if (window.__trackerInstalled) return;
        window.__trackerInstalled = true;
        const isTop = window === window.top;

        if (isTop) {
            window.__showCoord = (x, y) => {
                x = Math.round(x);
                y = Math.round(y);
                let dot = document.getElementById("mouse-dot");
                let label = document.getElementById("mouse-coord-display");
                if (!dot) {
                    dot = document.createElement("div");
                    dot.id = "mouse-dot";
                    Object.assign(dot.style, {
                        position: "fixed", pointerEvents: "none", zIndex: "2147483647",
                        width: "2px", height: "2px", borderRadius: "50%",
                        background: "red", transform: "translate(-50%, -50%)"
                    });
                    label = document.createElement("div");
                    label.id = "mouse-coord-display";
                    Object.assign(label.style, {
                        position: "fixed", pointerEvents: "none", zIndex: "2147483647",
                        background: "rgba(0,0,0,0.85)", color: "#00ff00",
                        padding: "3px 8px", fontSize: "12px", fontFamily: "monospace",
                        borderRadius: "4px", border: "1px solid #00ff00"
                    });
                    const root = document.body || document.documentElement;
                    root.appendChild(dot);
                    root.appendChild(label);
                }
                dot.style.left = x + "px";
                dot.style.top = y + "px";
                label.innerText = `X:${x} Y:${y}`;
                label.style.left = (x + 12) + "px";
                label.style.top = (y + 12) + "px";
            };
        }

        let last = null, pending = false;
        const onMove = (e) => {
            last = e;
            if (pending) return;
            pending = true;
            requestAnimationFrame(() => {
                pending = false;
                if (isTop) window.__showCoord(last.clientX, last.clientY);
                window.__mouseReport(last.screenX, last.screenY, last.clientX, last.clientY);
            });
        };

        for (const t of ["mousemove", "pointermove"]) {
            window.addEventListener(t, onMove, { capture: true, passive: true });
        }
    };

    try { await page.addInitScript(trackerScript); } catch (_) { }
    for (const frame of page.frames()) {
        try { await frame.evaluate(trackerScript); } catch (_) { }
    }
}

async function UI_TieuDiem(page, X, Y, width, height, id, color = "red") {
    await page.evaluate(({ X, Y, width, height, id, color }) => {
        let div = document.getElementById(id);
        if (!div) {
            div = document.createElement("div");
            div.id = id;
            div.style.position = "absolute";
            div.style.zIndex = 9999;
            div.style.pointerEvents = "none";
            document.body.appendChild(div);
        }

        Object.assign(div.style, {
            left: X + "px",
            top: Y + "px",
            width: width + "px",
            height: height + "px",
            opacity: 1,
            transform: "translate(-50%, -50%)",
            border: `2px solid ${color}`,
            backgroundColor: color,
            display: "block",
            borderRadius: "50%"
        });
    }, { X, Y, width, height, id, color });
}


module.exports = {
    injectMouseTracker,
    UI_TieuDiem
};
