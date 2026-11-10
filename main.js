"use strict";

const { chromium } = require("playwright");
const { UI_Btn_BatDau, updateBatDau } = require("./src/UI/UI_Btn_BatDau");
require("dotenv").config();
const setting = require("./src/State/setting");   // đường dẫn tuỳ file bạn đứng

const { loadStateTXT } = require("./src/TXT/captureState");

const { UI_KetQua8Phong } = require("./src/UI/UI_KetQua8Phong");
const { UI_TableKiemthu } = require("./src/UI_TableKiemthu");
const { ExposeFC_Main } = require("./src/ExposeFunction/ExposeFC_Main");
const { showStats } = require("./src/UI/UI_InGame");
const { setupExposeFunctions } = require("./src/ExposeFunction/setupExposeFunctions");
const { UI_KiemTraVang, setupKiemTraVang } = require("./src/UI/UI_KiemTraVang");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// true = bật tâm xanh + chuột phải lấy toạ độ (khi chụp ảnh mẫu thì để false, kẻo tâm xanh dính vào ảnh)
const BAT_TAM_XANH = false;

// Gắn UI vào trang (gọi lần đầu và mỗi khi trang load lại / chuyển trang)
// → Sau này bỏ UI vào đây
async function ganUI(page) {
    await UI_Btn_BatDau(page, { text: "Bắt đầu" })
    await UI_KetQua8Phong(page, setting.get("phongRoomS"));
    await UI_TableKiemthu(page);
    // await UI_KiemTraVang(page);
    showStats(page, {
        soVonBanDau: setting.get("soVonBanDau"),
        profit: setting.get("profit"),
        solenhwin: setting.get("solenhwin"),
        solenhthua: setting.get("solenhthua"),
        solenhwin_Tab1: setting.get("solenhwin_Tab1"),
        solenhthua_Tab1: setting.get("solenhthua_Tab1"),
        solenhwin_Tab2: setting.get("solenhwin_Tab2"),
        solenhthua_Tab2: setting.get("solenhthua_Tab2"),
        soChuoiDat: setting.get("soChuoiDat"),
    });
}

// =========== MAIN ==================
(async () => {
    loadStateTXT();

    const browser = await chromium.launch({
        headless: false,
        args: ["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"],
    });

    const page = await browser.newPage();   // cửa sổ cố định 1280×720, DPR = 1


    // Ép popup / link target=_blank mở ngay trong tab hiện tại (để UI không bị mất ở tab mới)
    await page.addInitScript(() => {
        window.open = (url) => { if (url) location.href = url; return null; };
        document.addEventListener("click", (e) => {
            const a = e.target.closest && e.target.closest("a[target=_blank]");
            if (a) a.target = "_self";
        }, true);
    });

    // Tâm xanh + chuột phải lấy toạ độ (chạy trong mọi frame, mọi lần chuyển trang)
    if (BAT_TAM_XANH) {
        await page.addInitScript(() => {
            const khoiTao = () => {
                if (window.__tamXanh) return;
                window.__tamXanh = true;

                const st = document.createElement("style");
                st.textContent = "* { cursor: none !important; }";
                document.head.appendChild(st);

                const tam = document.createElement("div");
                tam.style.cssText = "position:fixed;left:-100px;top:-100px;width:0;height:0;z-index:2147483647;pointer-events:none;";
                tam.innerHTML =
                    '<div style="position:absolute;left:-12px;top:-1px;width:24px;height:2px;background:#22c55e"></div>' +
                    '<div style="position:absolute;left:-1px;top:-12px;width:2px;height:24px;background:#22c55e"></div>';
                document.body.appendChild(tam);

                document.addEventListener("mousemove", (e) => {
                    tam.style.left = e.clientX + "px";
                    tam.style.top = e.clientY + "px";
                }, true);

                document.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    window.FC_Log(e.clientX, e.clientY);

                    const dot = document.createElement("div");
                    dot.style.cssText = `position:fixed;left:${e.clientX - 3}px;top:${e.clientY - 3}px;
                    width:6px;height:6px;border-radius:50%;background:red;
                    z-index:2147483647;pointer-events:none;`;
                    document.body.appendChild(dot);
                    setTimeout(() => dot.remove(), 3000);
                }, true);
            };

            if (document.body) khoiTao();
            else document.addEventListener("DOMContentLoaded", khoiTao);
        });
    }

    await page.goto(process.env.X_URL, { waitUntil: "networkidle", timeout: 15 * 60 * 1000 });

    await setupExposeFunctions(page);
    await ExposeFC_Main(page);
    // await setupKiemTraVang(page);
    // Trong iframe, clientX chỉ tính từ góc iframe → cộng vị trí iframe để ra toạ độ thật
    await page.exposeBinding("FC_Log", async ({ frame }, x, y) => {
        let ox = 0, oy = 0;
        if (frame !== page.mainFrame()) {
            try {
                const box = await (await frame.frameElement()).boundingBox();
                if (box) { ox = box.x; oy = box.y; }
            } catch (_) { }
        }
        console.log(`x=${x + ox}, y=${y + oy}`);
    });

    await ganUI(page);

    page.on("load", async () => {
        try { await ganUI(page); } catch (e) { }
    });
    // ____________________________________________________________subscribe
    setting.subscribe((state, patch) => {
        if (
            patch.soVonBanDau !== undefined ||
            patch.profit !== undefined ||
            patch.solenhwin !== undefined ||
            patch.solenhthua !== undefined ||
            patch.solenhwin_Tab1 !== undefined ||
            patch.solenhthua_Tab1 !== undefined ||
            patch.solenhwin_Tab2 !== undefined ||
            patch.solenhthua_Tab2 !== undefined ||
            patch.soChuoiDat !== undefined
        ) {
            showStats(page, {
                soVonBanDau: state.soVonBanDau,
                profit: state.profit,
                solenhwin: state.solenhwin,
                solenhthua: state.solenhthua,
                solenhwin_Tab1: state.solenhwin_Tab1,
                solenhthua_Tab1: state.solenhthua_Tab1,
                solenhwin_Tab2: state.solenhwin_Tab2,
                solenhthua_Tab2: state.solenhthua_Tab2,
                soChuoiDat: state.soChuoiDat,
            });
        }
    });

})();
// =========== HẾT MAIN ==================