
"use strict";

const fs = require("fs");
const path = require("path");

const CSS_PATH = path.join(__dirname, "..", "CSS", "UI_Btn_BatDau.css");

async function updateBatDau(page, state = {}) {
    if (!page) return;

    const css = fs.readFileSync(CSS_PATH, "utf8");

    await page.evaluate(({ cssText, text, isActive }) => {

        // 1. Nạp CSS
        let style = document.getElementById("css-ui-bat-dau");

        if (!style) {
            style = document.createElement("style");
            style.id = "css-ui-bat-dau";
            document.head.appendChild(style);
        }

        style.textContent = cssText;

        // 2. Tạo nút nếu chưa có
        let btn = document.getElementById("btn-bat-dau");

        if (!btn) {
            btn = document.createElement("button");
            btn.id = "btn-bat-dau";

            btn.innerHTML = `
                <span class="bat-dau-icon">▶</span>
                <span class="bat-dau-text"></span>
            `;

            document.body.appendChild(btn);

            // 3. Sự kiện click
            btn.onclick = () => {
                if (typeof window.FC_BatDau === "function") {
                    window.FC_BatDau();
                }
            };
        }

        // 4. Cập nhật nội dung
        const textElement = btn.querySelector(".bat-dau-text");

        if (textElement) {
            textElement.textContent = text;
        }

        // 5. Đồng bộ trạng thái animation
        btn.classList.toggle("is-active", !!isActive);

        // 6. Đồng bộ icon
        const icon = btn.querySelector(".bat-dau-icon");

        if (icon) {
            icon.textContent = isActive ? "⟳" : "▶";
        }

    }, {
        cssText: css,
        text: state.text || "Bắt đầu",
        isActive: !!state.isActive
    }).catch(() => { });
}

async function UI_Btn_BatDau(page, state = {}) {
    await updateBatDau(page, state);
}

module.exports = {
    UI_Btn_BatDau,
    updateBatDau
};
