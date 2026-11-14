"use strict";

const fs = require("fs");
const path = require("path");

const CSS_PATH = path.join(__dirname, "..", "CSS", "UI_Login.css");

/**
 * Hiển thị popup đăng nhập trên màn hình browser
 * @param {import('playwright').Page} page 
 * @param {Object} defaultValues
 */
async function UI_Login(page, defaultValues = {}) {
    if (!page) return;

    const css = fs.readFileSync(CSS_PATH, "utf8");

    await page.evaluate(({ cssText, defaultTaiKhoan, defaultToolName }) => {
        // 1. Nạp CSS
        let style = document.getElementById("css-ui-login");
        if (!style) {
            style = document.createElement("style");
            style.id = "css-ui-login";
            document.head.appendChild(style);
        }
        style.textContent = cssText;

        // 2. Kiểm tra nếu đã có overlay login thì không tạo lại
        if (document.getElementById("ui-login-overlay")) {
            return;
        }

        // 3. Tạo khung Login
        const overlay = document.createElement("div");
        overlay.id = "ui-login-overlay";

        overlay.innerHTML = `
            <div id="ui-login-box">
                <div class="ui-login-header">
                    <div class="ui-login-icon">🔐</div>
                    <h2 class="ui-login-title">Tool ${defaultToolName || ""}</h2>
                    <div class="ui-login-subtitle">Đăng nhập tài khoản để kích hoạt tool tự động</div>
                </div>

                <div id="ui-login-error"></div>

                <div class="ui-login-group">
                    <label class="ui-login-label">Tài khoản</label>
                    <div class="ui-login-input-wrap">
                        <input type="text" id="ui-login-user" class="ui-login-input" placeholder="Nhập tên tài khoản..." value="${defaultTaiKhoan || ""}" />
                    </div>
                </div>

                <div class="ui-login-group">
                    <label class="ui-login-label">Mật khẩu</label>
                    <div class="ui-login-input-wrap">
                        <input type="password" id="ui-login-pass" class="ui-login-input" placeholder="Nhập mật khẩu..." />
                    </div>
                </div>

                <button id="ui-login-btn">
                    <span>ĐĂNG NHẬP</span>
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        const btn = document.getElementById("ui-login-btn");
        const userInput = document.getElementById("ui-login-user");
        const passInput = document.getElementById("ui-login-pass");
        const errBox = document.getElementById("ui-login-error");

        const submitAction = async () => {
            const taiKhoan = userInput.value.trim();
            const pass = passInput.value.trim();

            if (!taiKhoan || !pass) {
                errBox.style.display = "block";
                errBox.textContent = "Vui lòng nhập đầy đủ tài khoản và mật khẩu!";
                return;
            }

            errBox.style.display = "none";
            btn.disabled = true;
            btn.innerHTML = `<span>Đang xác thực...</span>`;

            try {
                if (typeof window.FC_Login === "function") {
                    const res = await window.FC_Login(taiKhoan, pass);
                    if (!res || !res.success) {
                        errBox.style.display = "block";
                        errBox.textContent = res?.message || "Đăng nhập thất bại!";
                        btn.disabled = false;
                        btn.innerHTML = `<span>ĐĂNG NHẬP</span>`;
                    }
                } else {
                    errBox.style.display = "block";
                    errBox.textContent = "Lỗi kết nối hàm FC_Login!";
                    btn.disabled = false;
                    btn.innerHTML = `<span>ĐĂNG NHẬP</span>`;
                }
            } catch (err) {
                errBox.style.display = "block";
                errBox.textContent = err.message || "Lỗi xác thực!";
                btn.disabled = false;
                btn.innerHTML = `<span>ĐĂNG NHẬP</span>`;
            }
        };

        btn.onclick = submitAction;

        const handleKey = (e) => {
            if (e.key === "Enter") {
                submitAction();
            }
        };
        userInput.addEventListener("keydown", handleKey);
        passInput.addEventListener("keydown", handleKey);

        setTimeout(() => {
            if (userInput.value) {
                passInput.focus();
            } else {
                userInput.focus();
            }
        }, 100);

    }, {
        cssText: css,
        defaultTaiKhoan: defaultValues.taiKhoan || "",
        defaultToolName: process.env.TOOL_NAME || ""
    }).catch(() => { });
}

/**
 * Gỡ bỏ popup đăng nhập khỏi màn hình
 * @param {import('playwright').Page} page 
 */
async function removeLoginUI(page) {
    if (!page) return;
    await page.evaluate(() => {
        const overlay = document.getElementById("ui-login-overlay");
        if (overlay) overlay.remove();
        const style = document.getElementById("css-ui-login");
        if (style) style.remove();
    }).catch(() => { });
}

module.exports = {
    UI_Login,
    removeLoginUI
};
