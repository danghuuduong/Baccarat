// src/UI/UI_InGame.js – Hiển thị lưới bài + thống kê trong phòng
"use strict";

/**
 * Hiển thị bảng lưới bi (15 cột × 6 hàng) ở giữa màn hình (top 30%).
 * @param {import('playwright').Page} page
 * @param {string[]} arr - Mảng "B"|"P"|"T"
 */
function showLuoiBi(page, arr) {
    if (!page) return;
    page.evaluate((data) => {
        const COLS = 15, ROWS = 6;

        // ── Inject CSS 1 lần ──────────────────────────────────────────────
        if (!document.getElementById("ui-ingame-style")) {
            const st = document.createElement("style");
            st.id = "ui-ingame-style";
            st.textContent = `
                #ui-luoi-bi {
                    position: fixed;
                    top: 20%;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 2147483646;
                    pointer-events: none;
                    background: rgba(255, 255, 255, 0.88);
                    backdrop-filter: blur(10px);
                    border: 1.5px solid rgba(0,0,0,0.12);
                    border-radius: 8px;
                    padding: 6px 8px;
                    display: none;
                }
                #ui-luoi-bi table {
                    border-collapse: collapse;
                    table-layout: fixed;
                }
                #ui-luoi-bi td {
                    width: 18px;
                    height: 18px;
                    border: 1px solid rgba(0,0,0,0.08);
                    border-radius: 50%;
                    text-align: center;
                    font: 700 9px/18px monospace;
                    color: #fff;
                }
                #ui-luoi-bi td.B { background: rgba(220,38,38,0.9); }
                #ui-luoi-bi td.P { background: rgba(37,99,235,0.9); }
                #ui-luoi-bi td.T { background: rgba(22,163,74,0.9); }
                #ui-luoi-bi td.empty { background: rgba(0,0,0,0.05); }
            `;
            document.head.appendChild(st);
        }

        // ── Tạo hoặc lấy panel ────────────────────────────────────────────
        let panel = document.getElementById("ui-luoi-bi");
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "ui-luoi-bi";
            const tbl = document.createElement("table");
            tbl.id = "ui-luoi-bi-table";
            for (let r = 0; r < ROWS; r++) {
                const tr = document.createElement("tr");
                for (let c = 0; c < COLS; c++) {
                    const td = document.createElement("td");
                    td.id = `lb-${r}-${c}`;
                    tr.appendChild(td);
                }
                tbl.appendChild(tr);
            }
            panel.appendChild(tbl);
            document.body.appendChild(panel);
        }

        // ── Điền dữ liệu vào lưới (cột-major: đổ từ trái sang phải, trên xuống dưới) ─
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const idx = c * ROWS + r;
                const td = document.getElementById(`lb-${r}-${c}`);
                if (!td) continue;
                const val = data[idx];
                if (val === "B" || val === "P" || val === "T") {
                    td.className = val;
                    td.textContent = val;
                } else {
                    td.className = "empty";
                    td.textContent = "";
                }
            }
        }

        panel.style.display = "block";
    }, arr).catch(() => { });
}

/**
 * Ẩn bảng lưới bi.
 * @param {import('playwright').Page} page
 */
function hideLuoiBi(page) {
    if (!page) return;
    page.evaluate(() => {
        const el = document.getElementById("ui-luoi-bi");
        if (el) el.style.display = "none";
    }).catch(() => { });
}

/**
 * Hiển thị / cập nhật panel thống kê góc trái dưới.
 * @param {import('playwright').Page} page
 * @param {{ soVonBanDau: number, profit: number, solenhwin: number, solenhthua: number }} stats
 */
function showStats(page, stats) {
    if (!page) return;
    page.evaluate((s) => {
        // ── Inject CSS 1 lần ──────────────────────────────────────────────
        if (!document.getElementById("ui-stats-style")) {
            const st = document.createElement("style");
            st.id = "ui-stats-style";
            st.textContent = `
                #ui-stats {
                    position: fixed;
                    bottom: 0;
                    left: -3px;
                    z-index: 2147483646;
                    pointer-events: none;
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(10px);
                    border-top: 1.5px solid rgba(0,0,0,0.12);
                    border-right: 1.5px solid rgba(0,0,0,0.12);
                    border-radius: 0 8px 0 0;
                    padding: 5px 5px;
                    font: 600 11px/1.6 monospace;
                    color: #000000ff;
                    min-width: 125px;
                }
                #ui-stats .s-label { color: #353f4bff; font-size: 10px; }
                #ui-stats .s-win   { color: #16a34a; }
                #ui-stats .s-lose  { color: #dc2626; }
                #ui-stats .s-profit-pos { color: #16a34a; }
                #ui-stats .s-profit-neg { color: #dc2626; }
            `;
            document.head.appendChild(st);
        }

        // ── Tạo hoặc lấy panel ────────────────────────────────────────────
        let panel = document.getElementById("ui-stats");
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "ui-stats";
            document.body.appendChild(panel);
        }

        const profitClass = s.profit >= 0 ? "s-profit-pos" : "s-profit-neg";
        const profitSign = s.profit >= 0 ? "+" : "";

        panel.innerHTML = `
            <div><span class="s-label">Vốn </span>${s.soVonBanDau}K</div>
            <div><span class="s-label">Lãi </span><span class="${profitClass}">${profitSign}${s.profit}K</span></div>
            <div><span class="s-label">Win </span><span class="s-win">${s.solenhwin}</span>  <span class="s-label">Thua </span><span class="s-lose">${s.solenhthua}</span></div>
            <div><span class="s-label">Tab1 win: </span><span class="s-win">${s.solenhwin_Tab1 || 0}</span>  <span class="s-label">Thua: </span><span class="s-lose">${s.solenhthua_Tab1 || 0}</span></div>
            <div><span class="s-label">Tab2 win: </span><span class="s-win">${s.solenhwin_Tab2 || 0}</span>  <span class="s-label">Thua: </span><span class="s-lose">${s.solenhthua_Tab2 || 0}</span></div>
        `;
    }, stats).catch(() => { });
}

module.exports = { showLuoiBi, hideLuoiBi, showStats };