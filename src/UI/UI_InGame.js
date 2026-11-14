// src/UI/UI_InGame.js – Hiển thị lưới bài + thống kê trong phòng
"use strict";

/**
 * Hiển thị bảng lưới bi (10 cột × 6 hàng). Dư thì lấy các item cuối của mảng.
 * @param {import('playwright').Page} page
 * @param {string[]} arr - Mảng "B"|"P"|"T"
 */
function showLuoiBi(page, arr) {
    if (!page) return;
    page.evaluate((data) => {
        const COLS = 10, ROWS = 6;
        data = Array.isArray(data) ? data : [];
        if (data.length > COLS * ROWS) data = data.slice(-(COLS * ROWS));

        // ── Inject CSS 1 lần ──────────────────────────────────────────────
        if (!document.getElementById("ui-ingame-style")) {
            const st = document.createElement("style");
            st.id = "ui-ingame-style";
            st.textContent = `
                #ui-luoi-bi {
                    position: fixed;
                    top: 0px;
                    left: 50%;
                    transform: translateX(-150%);
                    z-index: 2147483646;
                    pointer-events: none;
                    background: rgba(255, 255, 255, 0.88);
                    backdrop-filter: blur(10px);
                    border: 1.5px solid rgba(0,0,0,0.12);
                    border-radius: 8px;
                    padding: 3px 4px;
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
    }, arr).then(() => syncStatsUI(page)).catch(() => { });
}

/**
 * Ẩn bảng lưới bi (panel thống kê ẩn theo).
 * @param {import('playwright').Page} page
 */
function hideLuoiBi(page) {
    if (!page) return;
    page.evaluate(() => {
        const el = document.getElementById("ui-luoi-bi");
        if (el) el.style.display = "none";
    }).then(() => syncStatsUI(page)).catch(() => { });
}

/**
 * Đồng bộ panel thống kê / nút toggle theo lưới:
 *  - Lưới ẩn  → panel + nút toggle ẩn theo.
 *  - Lưới hiện → panel (nếu đang mở) hoặc nút toggle (nếu đang đóng) hiện ngay bên phải lưới.
 * @param {import('playwright').Page} page
 */
function syncStatsUI(page) {
    if (!page) return Promise.resolve();
    return page.evaluate(() => {
        if (!window.__uiSyncStats) {
            window.__uiSyncStats = () => {
                const g = document.getElementById("ui-luoi-bi");
                const p = document.getElementById("ui-stats");
                const m = document.getElementById("ui-stats-mini-toggle");
                if (!p || !m) return;
                const gridVisible = !!g && g.style.display === "block";
                if (window.__uiStatsOpen === undefined) window.__uiStatsOpen = false;
                if (window.__uiLastGrid === undefined) window.__uiLastGrid = false;
                // Lưới đổi trạng thái (vào/ra phòng) -> ép panel theo lưới: vào = mở, ra = đóng
                if (gridVisible !== window.__uiLastGrid) {
                    window.__uiLastGrid = gridVisible;
                    window.__uiStatsOpen = gridVisible;
                }
                const showPanel = window.__uiStatsOpen;
                p.style.display = showPanel ? "block" : "none";
                m.style.display = "block";

                // Vị trí: ngay bên phải lưới (lưới ẩn thì đo tạm để lấy chỗ)
                let left = "calc(50% - 90px)";
                if (g) {
                    let r;
                    if (gridVisible) {
                        r = g.getBoundingClientRect();
                    } else {
                        g.style.visibility = "hidden";
                        g.style.display = "block";
                        r = g.getBoundingClientRect();
                        g.style.display = "none";
                        g.style.visibility = "";
                    }
                    left = (r.right + 6) + "px";
                }
                // Panel sát mép trên; nút toggle nằm ngay sát bên phải panel
                p.style.left = left; p.style.top = "0px";
                m.style.left = `calc(${left} + 284px)`; m.style.top = "0px";
            };
            window.addEventListener("resize", () => window.__uiSyncStats());
        }
        window.__uiSyncStats();
    }).catch(() => { });
}

/**
 * Hiển thị / cập nhật panel thống kê dạng Table, nằm bên phải lưới.
 * Nút 📊 trên cùng bấm để bật / tắt.
 * @param {import('playwright').Page} page
 * @param {object} stats
 */
function showStats(page, stats) {
    if (!page) return;
    page.evaluate((s) => {
        // ── Inject CSS 1 lần ──────────────────────────────────────────────
        if (!document.getElementById("ui-stats-style")) {
            const st = document.createElement("style");
            st.id = "ui-stats-style";
            st.textContent = `
                /* Nút toggle bật/tắt panel */
                #ui-stats-mini-toggle {
                    position: fixed;
                    top: 0;
                    left: 62%; /* sẽ bị JS ghi đè theo vị trí panel */
                    z-index: 2147483647;
                    background: #fbfbfbff;
                    color: #010101ff;
                    border: 1px solid #f4070bff;
                    padding: 5px 5px;
                    border-radius: 0 0 4px 4px;
                    font: 700 11px sans-serif;
                    cursor: pointer;
                    display: none;
                    box-shadow: 0 2px 8px rgba(15, 187, 244, 0.5);
                }
                /* Panel thống kê chính (mặc định ẩn) */
                #ui-stats {
                    position: fixed;
                    z-index: 2147483646;
                    pointer-events: auto;
                    background: rgba(255, 255, 255, 0.97);
                    backdrop-filter: blur(12px);
                    border: 1.5px solid rgba(0,0,0,0.18);
                    border-radius: 10px;
                    padding: 4px 6px;
                    font: 600 10px/1.25 "Segoe UI", Roboto, sans-serif;
                    color: #0f172a;
                    width: 280px;
                    max-height: 70vh;
                    overflow-y: auto;
                    box-sizing: border-box;
                    box-shadow: 0 0 10px 2px rgba(249, 76, 8, 0.45)
                    display: none;
                }
                #ui-stats .stats-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: 2px;
                    margin-bottom: 1px;
                    border-bottom: 1.5px solid #cbd5e1;
                }
                #ui-stats .stats-title {
                    font-weight: 800;
                    font-size: 11px;
                    color: #1e293b;
                    letter-spacing: 0.2px;
                }
                #ui-stats table.table-box {
                    border-collapse: collapse;
                    width: 100%;
                    margin-top: 3px;
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    border-radius: 4px;
                    overflow: hidden;
                }
                #ui-stats table.table-box thead th {
                    background: #f1f5f9;
                    color: #334155;
                    font-size: 10px;
                    font-weight: 800;
                    padding: 2px 5px;
                    border-bottom: 1px solid #cbd5e1;
                    text-align: left;
                }
                #ui-stats table.table-box td {
                    padding: 1px 5px;
                    border-bottom: 1px solid #f1f5f9;
                    font-size: 10px;
                    vertical-align: middle;
                }
                #ui-stats table.table-box tr:last-child td {
                    border-bottom: none;
                }
                #ui-stats .td-label {
                    color: #64748b;
                    font-weight: 600;
                    width: 47%;
                    white-space: nowrap;
                }
                #ui-stats .td-val {
                    font-weight: 700;
                    text-align: right;
                    white-space: nowrap;
                }
                #ui-stats .s-win { color: #16a34a; font-weight: 700; }
                #ui-stats .s-lose { color: #dc2626; font-weight: 700; }
                #ui-stats .s-profit-pos { color: #16a34a; font-weight: 800; }
                #ui-stats .s-profit-neg { color: #dc2626; font-weight: 800; }
                #ui-stats .s-sub { color: #94a3b8; font-size: 9px; font-weight: normal; }
                #ui-stats input.num-input {
                    width: 46px;
                    padding: 0 3px;
                    font: 700 10px monospace;
                    border: 1px solid #94a3b8;
                    border-radius: 3px;
                    background: #ffffff;
                    color: #0f172a;
                    text-align: center;
                    outline: none;
                    box-sizing: border-box;
                }
                #ui-stats input.num-input:focus {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 1px #2563eb;
                }
                #ui-stats button.btn-reload {
                    margin-top: 3px;
                    width: 100%;
                    padding: 2px 0;
                    font: 700 10px sans-serif;
                    border: 1px solid #94a3b8;
                    border-radius: 4px;
                    background: #f8fafc;
                    color: #334155;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                #ui-stats button.btn-reload:hover {
                    background: #e2e8f0;
                    border-color: #64748b;
                }
            `;
            document.head.appendChild(st);
        }

        // ── 1. Tạo nút toggle ─────────────────────────────────────────────
        let miniToggle = document.getElementById("ui-stats-mini-toggle");
        if (!miniToggle) {
            miniToggle = document.createElement("button");
            miniToggle.id = "ui-stats-mini-toggle";
            miniToggle.textContent = "📊";
            miniToggle.title = "Bật / tắt thống kê";
            document.body.appendChild(miniToggle);
        }

        // ── 2. Tạo hoặc lấy panel chính ────────────────────────────────────
        let panel = document.getElementById("ui-stats");
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "ui-stats";
            document.body.appendChild(panel);
        }

        // Click nút -> bật/tắt panel
        miniToggle.onclick = () => {
            window.__uiStatsOpen = !window.__uiStatsOpen;
            if (window.__uiSyncStats) window.__uiSyncStats();
        };

        const vonVal = s.soVonBanDau_DCA ?? s.soVonBanDau ?? 0;
        const maxVal = s.SoTienLonNhatTungSoHuu_DCA ?? s.SoTienLonNhatTungSoHuu ?? 0;

        // Gắn sự kiện lưu cho 1 input (Enter/blur/change lưu, Escape huỷ)
        const ganInput = (inputEl, tenHam, giaTriCu) => {
            if (!inputEl) return;
            const save = () => {
                if (inputEl.value === "" || isNaN(parseFloat(inputEl.value))) {
                    inputEl.value = giaTriCu();
                    return;
                }
                if (typeof window[tenHam] === "function") window[tenHam](inputEl.value);
            };
            inputEl.addEventListener("change", save);
            inputEl.addEventListener("blur", save);
            inputEl.addEventListener("keydown", (e) => {
                if (e.key === "Enter") { save(); inputEl.blur(); }
                else if (e.key === "Escape") { inputEl.value = giaTriCu(); inputEl.blur(); }
            });
        };

        let container = document.getElementById("ui-stats-container");

        if (!container) {
            panel.innerHTML = "";

            // Header
            const header = document.createElement("div");
            header.className = "stats-header";
            header.innerHTML = `
                <span class="stats-title">📊 THỐNG KÊ CHI TIẾT</span>
            `;
            panel.appendChild(header);

            // Container chứa nội dung các bảng
            container = document.createElement("div");
            container.id = "ui-stats-container";
            panel.appendChild(container);

            // 1. Bảng Thông số Vốn & Cấu hình
            const editDiv = document.createElement("div");
            editDiv.id = "ui-stats-edit";
            editDiv.innerHTML = `
                <table class="table-box">
                    <thead>
                        <tr>
                            <th colspan="4">💰 SETTING Chung</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="td-label">Vốn Đầu:</td>
                            <td><input id="input-von" class="num-input" type="number"  value="${vonVal}" /></td>
                            <td class="td-label">Tiền > Nhất:</td>
                            <td><input id="input-max" class="num-input" type="number"  value="${maxVal}" /></td>
                        </tr>
                        <tr>
                            <td class="td-label">Tổn Thất Max:</td>
                            <td class="td-val"><span id="ui-ton-that" class="s-profit-neg">0</span></td>
                            <td class="td-label">Ngầm:</td>
                            <td><input id="input-so-chuoi-dat" class="num-input" type="number"  value="${s.soChuoiDat ?? 2}" /></td>
                        </tr>
                    </tbody>
                </table>
            `;
            container.appendChild(editDiv);
            ganInput(editDiv.querySelector("#input-von"), "FC_CapNhatVon", () => s.soVonBanDau_DCA ?? s.soVonBanDau);
            ganInput(editDiv.querySelector("#input-max"), "FC_CapNhatMax", () => s.SoTienLonNhatTungSoHuu_DCA ?? s.SoTienLonNhatTungSoHuu ?? 0);
            ganInput(editDiv.querySelector("#input-so-chuoi-dat"), "FC_CapNhatSoChuoiDat", () => s.soChuoiDat ?? 2);

            // 2. Bảng BOT 02: DCA
            const dcaDiv = document.createElement("div");
            dcaDiv.id = "ui-stats-dca";
            container.appendChild(dcaDiv);

            // 3. Bảng BOT 03: SW
            const swDiv = document.createElement("div");
            swDiv.id = "ui-stats-sw";
            container.appendChild(swDiv);

            // 4. Bảng Hệ Thống Mốc & Tỉ Số
            const extraDiv = document.createElement("div");
            extraDiv.id = "ui-stats-extra";
            container.appendChild(extraDiv);

            // 5. Nút Reload
            const btnReload = document.createElement("button");
            btnReload.id = "btn-reload-stats";
            btnReload.className = "btn-reload";
            btnReload.textContent = "🔄 Tải Lại Dữ Liệu (Reload)";
            btnReload.title = "Đồng bộ lại từ CSDL MongoDB";
            btnReload.onclick = async () => {
                btnReload.textContent = "⏳ Đang tải...";
                if (typeof window.FC_ReloadThongKe === "function") {
                    await window.FC_ReloadThongKe();
                } else if (typeof window.FC_ResetThongKe === "function") {
                    await window.FC_ResetThongKe();
                }
                btnReload.textContent = "🔄 Tải Lại Dữ Liệu (Reload)";
            };
            container.appendChild(btnReload);
        } else {
            // Cập nhật giá trị input khi không focus
            const capNhatInput = (id, v) => {
                const el = document.getElementById(id);
                if (el && document.activeElement !== el && v !== undefined) el.value = v;
            };
            capNhatInput("input-von", vonVal);
            capNhatInput("input-max", maxVal);
            capNhatInput("input-so-chuoi-dat", s.soChuoiDat);
        }

        // Bấm chuột ra ngoài input thì nhả focus
        if (!window.__uiStatsInputBlurAttached) {
            window.__uiStatsInputBlurAttached = true;
            window.addEventListener("pointerdown", (e) => {
                const a = document.activeElement;
                if (a && a.tagName === "INPUT" && a.closest("#ui-stats") && e.target !== a) {
                    a.blur();
                }
            }, true);
        }

        // ── Render Bảng BOT 1: DCA ─────────────────────────────────────────
        const profitDCA = s.profit_DCA ?? s.profit ?? 0;
        const profitDCAClass = profitDCA >= 0 ? "s-profit-pos" : "s-profit-neg";
        const profitDCASign = profitDCA >= 0 ? "+" : "";
        const winDCA = s.solenhwin_DCA ?? s.solenhwin ?? 0;
        const thuaDCA = s.solenhthua_DCA ?? s.solenhthua ?? 0;
        const tongLenhDCA = winDCA + thuaDCA;
        const tiLeDCA = tongLenhDCA > 0 ? Math.round((winDCA / tongLenhDCA) * 100) : 0;

        const dcaDiv = document.getElementById("ui-stats-dca");
        if (dcaDiv) {
            dcaDiv.innerHTML = `
                <table class="table-box">
                    <thead>
                        <tr>
                            <th colspan="2">🤖 BOT 02: DCA (Bot Chính)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="td-label">Lợi Nhuận:</td>
                            <td class="td-val"><span class="${profitDCAClass}">${profitDCASign}${profitDCA} K</span></td>
                        </tr>
                        <tr>
                            <td class="td-label">Thắng / Thua:</td>
                            <td class="td-val">
                                <span class="s-win">${winDCA} Thắng</span> / 
                                <span class="s-lose">${thuaDCA} Thua</span>
                                <span class="s-sub">(${tiLeDCA}%)</span>
                            </td>
                        </tr>
                        <tr>
                            <td class="td-label">Chuỗi BCR:</td>
                            <td class="td-val">
                                <span>${s.bcr ?? 0}</span>
                                <span class="s-sub">(Sâu nhất: <span class="s-lose">${s.bcrSauNhat ?? 0}</span>)</span>
                            </td>
                        </tr>
                        <tr>
                            <td class="td-label">Lãi Chu Kỳ:</td>
                            <td class="td-val">
                                <span class="${(s.laiChuKy ?? 0) >= 0 ? "s-win" : "s-lose"}">${s.laiChuKy ?? 0} K</span>
                                <span class="s-sub">(Cần: +20K)</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        // ── Render Bảng BOT 2: SW ──────────────────────────────────────────
        const profitSW = s.profit_SW ?? 0;
        const profitSWClass = profitSW >= 0 ? "s-profit-pos" : "s-profit-neg";
        const profitSWSign = profitSW >= 0 ? "+" : "";
        const winSW = s.solenhwin_SW ?? 0;
        const thuaSW = s.solenhthua_SW ?? 0;
        const tongLenhSW = winSW + thuaSW;
        const tiLeSW = tongLenhSW > 0 ? Math.round((winSW / tongLenhSW) * 100) : 0;
        const bcrSWVal = s.bcr_sw ?? 0;
        const volSWDuKien = Math.min(50, 2 * (1 + Math.abs(Math.min(0, bcrSWVal))));

        const swDiv = document.getElementById("ui-stats-sw");
        if (swDiv) {
            swDiv.innerHTML = `
                <table class="table-box">
                    <thead>
                        <tr>
                            <th colspan="2">🎯 BOT 03: SW</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="td-label">Lợi Nhuận:</td>
                            <td class="td-val"><span class="${profitSWClass}">${profitSWSign}${profitSW} K</span></td>
                        </tr>
                        <tr>
                            <td class="td-label">Thắng / Thua:</td>
                            <td class="td-val">
                                <span class="s-win">${winSW} Thắng</span> / 
                                <span class="s-lose">${thuaSW} Thua</span>
                                <span class="s-sub">(${tiLeSW}%)</span>
                            </td>
                        </tr>
                        <tr>
                            <td class="td-label">Chuỗi BCR SW:</td>
                            <td class="td-val">
                                <span class="s-lose">${bcrSWVal}</span>
                                <span class="s-sub">(Cược tiếp: <b style="color:#0f172a">${volSWDuKien}K</b>)</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        // Cập nhật tổn thất
        const tonEl = document.getElementById("ui-ton-that");
        if (tonEl) tonEl.textContent = s.TonThat_Max_DCA ?? s.TonThat_Max ?? 0;

        // ── Render Bảng Tỉ số Mốc ──────────────────────────────────────────
        const vs = s.VSTISO || 0;
        const extraDiv = document.getElementById("ui-stats-extra");
        if (extraDiv) {
            extraDiv.innerHTML = `
                <table class="table-box">
                    <thead>
                        <tr>
                            <th colspan="2">📊 HỆ THỐNG MỐC & TỈ SỐ Ngầm Tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="td-label"> Dương / Âm:</td>
                            <td class="td-val"><span class="s-win">${s.tiSoDuong || 0} Dương</span> / <span class="s-lose">${s.tiSoAm || 0} Âm</span></td>
                        </tr>
                        <tr>
                            <td class="td-label">Tỉ Số Ngầm tiền :</td>
                            <td class="td-val ${vs >= 0 ? "s-win" : "s-lose"}">${vs > 0 ? "+" : ""}${vs}</td>
                        </tr>
                        <tr>
                            <td class="td-label">Âm / Dương max nhât</td>
                            <td class="td-val"><span class="s-lose">${s.VSTISO_Am_Max || 0}</span> / <span class="s-win">${s.VSTISO_Duong_Max || 0}</span></td>
                        </tr>
                    </tbody>
                </table>
            `;
        }
    }, stats).then(() => syncStatsUI(page)).catch(() => { });
}

module.exports = { showLuoiBi, hideLuoiBi, showStats };