// src/UI/UI_KiemTraVang.js – Nút kiểm tra DocKetQuaVang (gắn ở góc dưới trái)
"use strict";

const { DocKetQuaVang } = require("../Util/DocKetQuaVang");
const { typeKetQuaToaDo } = require("../config/RoomConfig");

// Gọi 1 lần duy nhất (exposeFunction giữ nguyên khi trang load lại)
async function setupKiemTraVang(page) {
    await page.exposeFunction("FC_KiemTraVang", async (roomType) => {
        try {
            const kq = await DocKetQuaVang(page, roomType);
            // console.log("[KiemTraVang]", roomType, "→", kq);
            return String(kq);
        } catch (e) {
            console.log("[KiemTraVang] lỗi:", e.message);
            return "LỖI: " + e.message;
        }
    });
}

// Gọi mỗi lần trang load (nằm trong ganUI)
async function UI_KiemTraVang(page) {
    const rooms = Object.keys(typeKetQuaToaDo);

    await page.evaluate((rooms) => {
        if (document.getElementById("__kiemTraVang")) return;

        const box = document.createElement("div");
        box.id = "__kiemTraVang";
        box.style.cssText =
            "position:fixed !important;left:0px !important;bottom:3px !important;z-index:2147483647 !important;" +
            "display:flex !important;flex-direction:column !important;gap:3px !important;align-items:stretch !important;" +
            "background:#222 !important;color:#fff !important;padding:1px 1px !important;" +
            "border-radius:6px !important;font:12px sans-serif !important;";

        // Hàng 1: chọn type
        const sel = document.createElement("select");
        sel.style.cssText =
            "background:#fff !important;color:#000 !important;border:1px solid #888 !important;" +
            "padding:2px !important;font:12px sans-serif !important;";
        rooms.forEach((r) => {
            const o = document.createElement("option");
            o.value = o.textContent = r;
            o.style.cssText = "background:#fff !important;color:#000 !important;";
            sel.appendChild(o);
        });

        // Hàng 2: nút bấm + kết quả
        const hang2 = document.createElement("div");
        hang2.style.cssText = "display:flex !important;gap:6px !important;align-items:center !important;";

        const btn = document.createElement("button");
        btn.textContent = "Kiểm tra vàng";
        btn.style.cssText =
            "background:#f59e0b !important;color:#000 !important;border:none !important;" +
            "cursor:pointer !important;padding:3px 6px !important;border-radius:4px !important;" +
            "font:bold 12px sans-serif !important;";

        const kq = document.createElement("span");
        kq.textContent = "-";
        kq.style.cssText =
            "color:#fff !important;background:transparent !important;min-width:40px !important;" +
            "font:bold 12px sans-serif !important;";

        btn.onclick = async () => {
            kq.textContent = "...";
            kq.textContent = await window.FC_KiemTraVang(sel.value);
        };

        hang2.append(btn, kq);
        box.append(sel, hang2);
        document.body.appendChild(box);
    }, rooms);
}

module.exports = { setupKiemTraVang, UI_KiemTraVang };