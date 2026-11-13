"use strict";

const { chromium } = require("playwright");
const { UI_Btn_BatDau, updateBatDau } = require("./src/UI/UI_Btn_BatDau");
const { UI_Login, removeLoginUI } = require("./src/UI/UI_Login");
const { verifyLogin } = require("./src/util/mongoDB");
require("dotenv").config();
const setting = require("./src/State/setting");   // đường dẫn tuỳ file bạn đứng

const { loadStateTXT } = require("./src/TXT/captureState");
const { loadSettingTXT, saveSettingTXT } = require("./src/TXT/settingState");

const { UI_KetQua8Phong } = require("./src/UI/UI_KetQua8Phong");
const { UI_TableKiemthu } = require("./src/UI_TableKiemthu");
const { ExposeFC_Main } = require("./src/ExposeFunction/ExposeFC_Main");
const { showStats } = require("./src/UI/UI_InGame");
const { setupExposeFunctions } = require("./src/ExposeFunction/setupExposeFunctions");
const { setupKiemTraLED, UI_KiemTraLED } = require("./src/UI/UI_KiemTraLED");
const { hienKhung } = require("./src/util/DocBi");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// true = bật tâm xanh + chuột phải lấy toạ độ (khi chụp ảnh mẫu thì để false, kẻo tâm xanh dính vào ảnh)
const BAT_TAM_XANH = true;

// Gắn UI vào trang (gọi lần đầu và mỗi khi trang load lại / chuyển trang)
// → Sau này bỏ UI vào đây
async function ganUI(page) {
    await UI_Btn_BatDau(page, { text: "Bắt đầu" })
    await UI_KetQua8Phong(page, setting.get("phongRoomS"));
    await UI_TableKiemthu(page);
    // await UI_KiemTraLED(page);
    showStats(page, {
        soVonBanDau: setting.get("soVonBanDau"),
        SoTienLonNhatTungSoHuu: setting.get("SoTienLonNhatTungSoHuu"),
        profit: setting.get("profit"),
        solenhwin: setting.get("solenhwin"),
        solenhthua: setting.get("solenhthua"),
        solenhwin_Tab1: setting.get("solenhwin_Tab1"),
        solenhthua_Tab1: setting.get("solenhthua_Tab1"),
        solenhwin_Tab2: setting.get("solenhwin_Tab2"),
        solenhthua_Tab2: setting.get("solenhthua_Tab2"),
        soChuoiDat: setting.get("soChuoiDat"),

        TonThat_Max: setting.get("TonThat_Max"),
        tiSoDuong: setting.get("tiSoDuong"),
        tiSoAm: setting.get("tiSoAm"),
        VSTISO: setting.get("VSTISO"),
        VSTISO_Duong_Max: setting.get("VSTISO_Duong_Max"),
        VSTISO_Am_Max: setting.get("VSTISO_Am_Max"),
    });
}

// =========== MAIN ==================
(async () => {
    loadStateTXT();
    loadSettingTXT();

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

                const laTop = window === window.top;

                const st = document.createElement("style");
                st.textContent = "* { cursor: none !important; }";
                document.head.appendChild(st);

                let px = 100, py = 100;   // vị trí chấm (toạ độ trang chính)
                let capNhat = () => { };

                // Chỉ frame trên cùng mới có chấm
                if (laTop) {
                    const cham = document.createElement("div");
                    cham.style.cssText =
                        "position:fixed;width:6px;height:6px;border-radius:50%;background:#2563eb;" +
                        "z-index:2147483647;pointer-events:none;";
                    document.body.appendChild(cham);

                    capNhat = () => {
                        cham.style.left = (px - 3) + "px";
                        cham.style.top = (py - 3) + "px";
                    };
                    capNhat();
                }

                // Xử lý sự kiện ở frame trên cùng
                const xuLy = (d) => {
                    if (d.loai === "move") { px = d.x; py = d.y; capNhat(); }
                    else if (d.loai === "key") {
                        if (d.key === "ArrowLeft") px -= 1;
                        else if (d.key === "ArrowRight") px += 1;
                        else if (d.key === "ArrowUp") py -= 1;
                        else if (d.key === "ArrowDown") py += 1;
                        capNhat();
                    }
                    else if (d.loai === "log") window.FC_Log(px, py);
                };

                // Gửi sự kiện: top thì xử lý luôn, frame con thì đẩy lên cha
                const gui = (d) => {
                    if (laTop) xuLy(d);
                    else window.parent.postMessage({ tamXanh: true, ...d }, "*");
                };

                // Nhận từ frame con: cộng vị trí iframe rồi xử lý / đẩy tiếp lên
                window.addEventListener("message", (e) => {
                    const d = e.data;
                    if (!d || !d.tamXanh) return;
                    const x = { ...d };
                    if (d.loai === "move") {
                        for (const f of document.querySelectorAll("iframe,frame")) {
                            if (f.contentWindow === e.source) {
                                const b = f.getBoundingClientRect();
                                const cs = getComputedStyle(f);
                                const pl = parseFloat(cs.paddingLeft) || 0;
                                const pt = parseFloat(cs.paddingTop) || 0;
                                const sx = f.offsetWidth ? b.width / f.offsetWidth : 1;
                                const sy = f.offsetHeight ? b.height / f.offsetHeight : 1;
                                x.x = b.left + (f.clientLeft + pl + d.x) * sx;
                                x.y = b.top + (f.clientTop + pt + d.y) * sy;
                                break;
                            }
                        }
                    }
                    if (laTop) xuLy(x);
                    else window.parent.postMessage(x, "*");
                });

                // Chuột: ở frame nào cũng gửi về top
                document.addEventListener("mousemove", (e) => {
                    gui({ loai: "move", x: e.clientX, y: e.clientY });
                }, true);

                // Phím mũi tên chỉnh 1px
                document.addEventListener("keydown", (e) => {
                    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
                        e.preventDefault();
                        gui({ loai: "key", key: e.key });
                    }
                }, true);

                // Phím + (hoặc =) : in toạ độ
                document.addEventListener("keydown", (e) => {
                    if (e.key === "+" || e.key === "=" || e.code === "NumpadAdd") {
                        e.preventDefault();
                        gui({ loai: "log" });
                    }
                }, true);

                // Chuột phải: in toạ độ
                document.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    gui({ loai: "log" });
                }, true);
            };

            if (document.body) khoiTao();
            else document.addEventListener("DOMContentLoaded", khoiTao);
        });
    }

    await page.goto(process.env.X_URL, { waitUntil: "networkidle", timeout: 15 * 60 * 1000 });

    await setupExposeFunctions(page);
    await ExposeFC_Main(page);
    // await setupKiemTraLED(page);

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

    // Đăng ký hàm đăng nhập FC_Login
    await page.exposeFunction("FC_Login", async (taiKhoan, pass) => {
        const result = await verifyLogin(taiKhoan, pass);
        if (!result.success) {
            return result;
        }

        const toolName = process.env.TOOL_NAME || "01";

        // Lấy thông số của tool tương ứng từ BE / CSDL
        const tool = (result.account.tools || []).find((t) => String(t.toolName) === String(toolName));
        const profit = tool ? (Number(tool.profit) || 0) : 0;
        const solenhwin = tool ? (Number(tool.win) || 0) : 0;
        const solenhthua = tool ? (Number(tool.Thua) || 0) : 0;

        // Lưu thông tin account & tool vào setting
        setting.set("currentAccount", result.account);
        setting.set("currentToolName", toolName);

        // Set lại 3 thông số từ BE vào setting và lưu đồng bộ vào state2.txt
        setting.set({
            profit: profit,
            solenhwin: solenhwin,
            solenhthua: solenhthua,
        });
        saveSettingTXT();

        // Gỡ bỏ modal Login
        await removeLoginUI(page);

        // Kích hoạt toàn bộ UI chức năng (Nút Bắt đầu, Stats, Bảng 8 phòng...)
        await ganUI(page);

        return { success: true };
    });

    const kiemTraVaGanUI = async () => {
        if (setting.get("currentAccount")) {
            await ganUI(page);
        } else {
            await UI_Login(page);
        }
    };

    await kiemTraVaGanUI();
    // await hienKhung(page);   // ← test xong thì xoá dòng này
    page.on("load", async () => {
        try {
            await kiemTraVaGanUI();
            // await hienKhung(page);
        }
        catch (e) { }
    });
    // ____________________________________________________________subscribe
    setting.subscribe((state, patch) => {
        if (!setting.get("currentAccount")) return; // Chưa đăng nhập thì không update stats
        if (
            patch.soVonBanDau !== undefined ||
            patch.SoTienLonNhatTungSoHuu !== undefined ||
            patch.profit !== undefined ||
            patch.solenhwin !== undefined ||
            patch.solenhthua !== undefined ||
            patch.solenhwin_Tab1 !== undefined ||
            patch.solenhthua_Tab1 !== undefined ||
            patch.solenhwin_Tab2 !== undefined ||
            patch.solenhthua_Tab2 !== undefined ||
            patch.soChuoiDat !== undefined ||

            patch.TonThat_Max !== undefined ||
            patch.tiSoDuong !== undefined ||
            patch.tiSoAm !== undefined ||
            patch.VSTISO !== undefined ||
            patch.VSTISO_Duong_Max !== undefined ||
            patch.VSTISO_Am_Max !== undefined
        ) {
            showStats(page, {
                soVonBanDau: state.soVonBanDau,
                SoTienLonNhatTungSoHuu: state.SoTienLonNhatTungSoHuu,
                profit: state.profit,
                solenhwin: state.solenhwin,
                solenhthua: state.solenhthua,
                solenhwin_Tab1: state.solenhwin_Tab1,
                solenhthua_Tab1: state.solenhthua_Tab1,
                solenhwin_Tab2: state.solenhwin_Tab2,
                solenhthua_Tab2: state.solenhthua_Tab2,
                soChuoiDat: state.soChuoiDat,

                TonThat_Max: state.TonThat_Max,
                tiSoDuong: state.tiSoDuong,
                tiSoAm: state.tiSoAm,
                VSTISO: state.VSTISO,
                VSTISO_Duong_Max: state.VSTISO_Duong_Max,
                VSTISO_Am_Max: state.VSTISO_Am_Max,
            });
        }
    });

})();
// =========== HẾT MAIN ==================