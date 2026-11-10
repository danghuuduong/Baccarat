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
 * @param {{ soVonBanDau: number, profit: number, solenhwin: number, solenhthua: number, solenhwin_Tab1?: number, solenhthua_Tab1?: number, solenhwin_Tab2?: number, solenhthua_Tab2?: number, soChuoiDat?: number }} stats
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
                    left: -4px;
                    z-index: 2147483646;
                    pointer-events: none;
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(10px);
                    border-top: 1.5px solid rgba(0,0,0,0.12);
                    border-right: 1.5px solid rgba(0,0,0,0.12);
                    border-radius: 0 8px 0 0;
                    padding: 5px 6px;
                    font: 600 11px/1.5 monospace;
                    color: #000000ff;
                    min-width: 115px;
                }
                #ui-stats .s-label { color: #353f4bff; font-size: 10px; }
                #ui-stats .s-win   { color: #16a34a; }
                #ui-stats .s-lose  { color: #dc2626; }
                #ui-stats .s-profit-pos { color: #16a34a; }
                #ui-stats .s-profit-neg { color: #dc2626; }
                #ui-stats input {
                    pointer-events: auto;
                    width: 38px;
                    padding: 1px 3px;
                    font: 700 11px monospace;
                    border: 1px solid #94a3b8;
                    border-radius: 4px;
                    background: #ffffff;
                    color: #0f172a;
                    text-align: center;
                    outline: none;
                }
                #ui-stats input:focus {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 1px #2563eb;
                }
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

        let statsInfo = document.getElementById("ui-stats-info");
        let inputRow = document.getElementById("ui-stats-input-row");

        if (!statsInfo || !inputRow) {
            panel.innerHTML = "";

            statsInfo = document.createElement("div");
            statsInfo.id = "ui-stats-info";
            panel.appendChild(statsInfo);

            inputRow = document.createElement("div");
            inputRow.id = "ui-stats-input-row";
            inputRow.innerHTML = `
                <div style="margin-top: 4px; display: flex; align-items: center; justify-content: space-between; gap: 4px; border-top: 1px solid rgba(0,0,0,0.08); padding-top: 3px;">
                    <span class="s-label">Ngầm:</span>
                    <input id="input-so-chuoi-dat" type="number" min="0" max="10" value="${s.soChuoiDat ?? 2}" />
                </div>
            `;
            panel.appendChild(inputRow);

            const inputEl = inputRow.querySelector("#input-so-chuoi-dat");
            if (inputEl) {
                const saveValue = () => {
                    if (inputEl.value === "" || isNaN(parseInt(inputEl.value, 10))) {
                        inputEl.value = s.soChuoiDat ?? 2;
                    }
                    if (typeof window.FC_CapNhatSoChuoiDat === "function") {
                        window.FC_CapNhatSoChuoiDat(inputEl.value);
                    }
                };

                inputEl.addEventListener("change", saveValue);

                inputEl.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        saveValue();
                        inputEl.blur();
                    } else if (e.key === "Escape") {
                        inputEl.value = s.soChuoiDat ?? 2;
                        inputEl.blur();
                    }
                });

                inputEl.addEventListener("blur", () => {
                    saveValue();
                });
            }
        } else {
            const inputEl = document.getElementById("input-so-chuoi-dat");
            if (inputEl && document.activeElement !== inputEl && s.soChuoiDat !== undefined) {
                inputEl.value = s.soChuoiDat;
            }
        }

        // Bấm chuột ra bất kỳ đâu ngoài input sẽ nhả focus (blur) ngay lập tức
        if (!window.__uiStatsInputBlurAttached) {
            window.__uiStatsInputBlurAttached = true;
            window.addEventListener("pointerdown", (e) => {
                const inp = document.getElementById("input-so-chuoi-dat");
                if (inp && document.activeElement === inp && e.target !== inp) {
                    inp.blur();
                }
            }, true);
        }

        statsInfo.innerHTML = `
            <div><span class="s-label">Vốn </span>${s.soVonBanDau}K</div>
            <div><span class="s-label">Lãi </span><span class="${profitClass}">${profitSign}${s.profit}K</span></div>
            <div><span class="s-label">Win </span><span class="s-win">${s.solenhwin}</span>  <span class="s-label">Thua </span><span class="s-lose">${s.solenhthua}</span></div>

            <div><span class="s-label">Tab-1</span></div>
            <div> <span class="s-label">win: </span><span class="s-win">${s.solenhwin_Tab1 || 0}</span>   <span class="s-label">Thua: </span><span class="s-lose">${s.solenhthua_Tab1 || 0}</span></div>

            <div><span class="s-label">Tab-2</span></div>
            <div> <span class="s-label">win: </span><span class="s-win">${s.solenhwin_Tab2 || 0}</span>   <span class="s-label">Thua: </span><span class="s-lose">${s.solenhthua_Tab2 || 0}</span></div>
        `;
    }, stats).catch(() => { });
}

module.exports = { showLuoiBi, hideLuoiBi, showStats };