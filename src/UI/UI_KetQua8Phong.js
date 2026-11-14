// src/UI/UI_KetQua.js – Bảng kết quả 8 bàn (2 cột × 4 hàng)
"use strict";

const fs = require("fs");
const path = require("path");

const CSS_PATH = path.join(__dirname, "..", "CSS", "UI_KetQua8Phong.css");

/**
 * Cập nhật bảng từ mảng 8 bàn. Tự tạo bảng nếu chưa có (kể cả khi trang bị load lại).
 * @param {string[][]} ban  8 mảng "B" | "P" | "T"
 */
async function update_UI_KetQua8Phong(page, ban = []) {
    if (!page) return;

    const css = fs.readFileSync(CSS_PATH, "utf8");

    await page.evaluate(({ cssText, ban }) => {

        // 1. Nạp CSS
        let style = document.getElementById("css-ui-ket-qua");
        if (!style) {
            style = document.createElement("style");
            style.id = "css-ui-ket-qua";
            document.head.appendChild(style);
        }
        if (style.textContent !== cssText) style.textContent = cssText;

        // 2. Tạo bảng nếu chưa có
        let panel = document.getElementById("ui-ket-qua");
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "ui-ket-qua";
            panel.style.display = "none";

            for (let i = 0; i < 8; i++) {
                const cell = document.createElement("div");
                cell.className = "kq-cell";
                cell.innerHTML = `
                    <div class="kq-title">Bàn ${i + 1}</div>
                    <div class="kq-bi"></div>
                `;
                panel.appendChild(cell);
            }
            document.body.appendChild(panel);
        }

        // 2b. Nút tắt/bật bảng (tạo 1 lần)
        if (!document.getElementById("ui-ket-qua-toggle")) {
            const toggleBtn = document.createElement("div");
            toggleBtn.id = "ui-ket-qua-toggle";
            toggleBtn.textContent = "▲";
            Object.assign(toggleBtn.style, {
                position: "fixed", top: "25px", right: "35px",
                padding: "1px 4px", fontSize: "10px", lineHeight: "1.2",
                background: "#fff", border: "1px solid #999",
                borderRadius: "4px", cursor: "pointer", zIndex: 2147483647,
            });
            toggleBtn.onclick = () => {
                const p = document.getElementById("ui-ket-qua");
                if (!p) return;
                const dangAn = p.style.display === "none";
                p.style.display = dangAn ? "" : "none";
                toggleBtn.textContent = dangAn ? "▼" : "▲";
            };
            document.body.appendChild(toggleBtn);
        }

        // 3. Cập nhật từng bàn (bàn nào không đổi thì bỏ qua)
        panel.querySelectorAll(".kq-cell").forEach((cell, i) => {
            const arr = ban[i] || [];
            const key = arr.join("");
            const bi = cell.querySelector(".kq-bi");

            if (bi.dataset.key === key && bi.children.length) return;
            bi.dataset.key = key;

            let html = "";
            for (let k = 0; k < 42; k++) {
                html += `<span class="kq-bi-${arr[k] || "X"}"></span>`;
            }
            bi.innerHTML = html;
            cell.querySelector(".kq-title").textContent = `Bàn ${i + 1} (${arr.length})`;
        });

    }, { cssText: css, ban }).catch(() => { });
}

/** Gọi trong ganUI */
async function UI_KetQua8Phong(page, ban) {
    await update_UI_KetQua8Phong(page, ban);
}

module.exports = { UI_KetQua8Phong, update_UI_KetQua8Phong };