// UI_KetQuaList.js – Bảng kết quả Baccarat (4 cột × 6 hàng)
// Góc trên bên trái, bên phải có nút "Lấy kết quả".
// Khi bấm nút, chụp 1 lần cả bảng (Fc_checkGrid), cắt từng ô (x,y cố định),
// hiển thị dấu chấm có chữ: xanh dương P=Player, đỏ B=Banker, xanh lá T=Tie, trống=không rõ.

"use strict";

const { checkGrid } = require("./util/checker");
const { IMAGES_DIR } = require("./captureState");

// ── Cấu hình toạ độ các ô (4 cột × 6 hàng) ──────────────────────────────────
// Cột 1: x=69, cột 2: x=88, cột 3: x=107, cột 4: x=126
// Hàng 1..6: y = 575, 595, 614, 632, 652, 671
// width=13, height=13 (vùng nhỏ đủ để khớp)
const CELL_W = 13;
const CELL_H = 13;

const COL_X = [69, 88, 107, 126];
const ROW_Y = [575, 595, 614, 632, 652, 671];

// Chụp cả bảng tối đa ATTEMPTS lần; lần nào có ít nhất 1 ô thấy là dừng
const ATTEMPTS = 2;
const RETRY_DELAY_MS = 80; // nghỉ giữa các lần thử

// Màu ứng với từng kết quả
const COLOR_MAP = {
    KetQua_Player: "#2563eb",  // blue
    KetQua_Banker: "#ef4444",  // red
    KetQua_Tie: "#16a34a",  // green
};

// Chữ hiển thị trong chấm
const LABEL_MAP = {
    KetQua_Player: "P",
    KetQua_Banker: "B",
    KetQua_Tie: "T",
};

async function UI_KetQuaList(page) {
    // Hàm Node: chụp 1 lần cả bảng, trả mảng tên theo thứ tự cells
    try {
        await page.exposeFunction("Fc_checkGrid", (cells) =>
            checkGrid(page, IMAGES_DIR, cells, CELL_W, CELL_H, undefined, 0.85, 0.04));
    } catch (_) { /* đã expose rồi thì bỏ qua */ }

    await page.evaluate(
        ({ colX, rowY, colorMap, labelMap, attempts, retryDelay }) => {
            if (document.getElementById("ui-ket-qua")) return;

            // ── STYLE ──────────────────────────────────────────────────────
            const style = document.createElement("style");
            style.textContent = `
                #ui-ket-qua * { box-sizing: border-box; }

                #ui-kq-panel {
                    position: fixed;
                    top: 416px;
                    left: 63px;
                    display: flex;
                    flex-direction: row;
                    align-items: flex-start;
                    gap: 8px;
                    z-index: 9998;
                    font-family: monospace;
                    font-size: 11px;
                }

                #ui-kq-table-wrap {
                    background: rgba(255,255,255,0.92);
                    border: 1px solid #555;
                    border-radius: 6px;
                    padding: 1px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.22);
                }

                #ui-kq-table {
                    border-collapse: collapse;
                }

                #ui-kq-table td {
                    width: 20px;
                    height: 20px;
                    border: 1px solid #bbb;
                    text-align: center;
                    vertical-align: middle;
                    background: #f8f8f8;
                    padding: 0;
                }

                .kq-dot {
                    display: inline-block;
                    width: 18px;
                    height: 18px;
                    line-height: 18px;
                    border-radius: 50%;
                    color: #fff;
                    font-size: 11px;
                    font-weight: bold;
                    font-family: monospace;
                    text-align: center;
                    vertical-align: middle;
                }

                #ui-kq-btn {
                    padding: 6px 10px;
                    background: #1e3a5f;
                    color: #fff;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: bold;
                    font-family: monospace;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.22);
                    white-space: nowrap;
                    transition: background .18s;
                    align-self: center;
                }
                #ui-kq-btn:hover { background: #2563eb; }
                #ui-kq-btn:disabled { background: #999; cursor: wait; }
            `;
            document.head.appendChild(style);

            // ── PANEL ──────────────────────────────────────────────────────
            const panel = document.createElement("div");
            panel.id = "ui-ket-qua";

            const kqPanel = document.createElement("div");
            kqPanel.id = "ui-kq-panel";

            // Bảng 4 cột × 6 hàng
            const tableWrap = document.createElement("div");
            tableWrap.id = "ui-kq-table-wrap";

            const table = document.createElement("table");
            table.id = "ui-kq-table";

            // Tạo tham chiếu ô: cells[col][row]
            const cells = [];
            const COLS = colX.length; // 4
            const ROWS = rowY.length; // 6

            // Tạo table theo hàng trước (HTML table: tbody > tr > td)
            for (let r = 0; r < ROWS; r++) {
                const tr = document.createElement("tr");
                for (let c = 0; c < COLS; c++) {
                    if (!cells[c]) cells[c] = [];
                    const td = document.createElement("td");
                    td.title = `Cột ${c + 1} - Hàng ${r + 1}`;
                    cells[c][r] = td;
                    tr.appendChild(td);
                }
                table.appendChild(tr);
            }

            tableWrap.appendChild(table);

            kqPanel.appendChild(tableWrap);
            panel.appendChild(kqPanel);
            document.body.appendChild(panel);

            // ── CSS animation pop-in cho chấm ─────────────────────────────
            const animStyle = document.createElement("style");
            animStyle.textContent = `
                @keyframes kq-popin {
                    0%   { transform: scale(0);   opacity: 0; }
                    70%  { transform: scale(1.25); opacity: 1; }
                    100% { transform: scale(1);   opacity: 1; }
                }
                @keyframes kq-flash {
                    0%,100% { opacity: 1; }
                    50%      { opacity: 0.25; }
                }
                .kq-dot { animation: kq-popin 0.22s ease-out both; }
                .kq-cell-loading { animation: kq-flash 0.5s ease-in-out infinite; background: #061220ff !important; }
            `;
            document.head.appendChild(animStyle);

            // ── Xoá sạch toàn bộ bảng (mượt mà) ─────────────────────────
            function clearAllCells() {
                for (let c = 0; c < COLS; c++) {
                    for (let r = 0; r < ROWS; r++) {
                        const td = cells[c][r];
                        td.innerHTML = "";
                        td.dataset.name = "";
                        td.classList.remove("kq-cell-loading");
                    }
                }
            }

            // ── Hiển thị ô đang chờ (nhấp nháy nhẹ) ─────────────────────
            function setCellLoading(col, row) {
                const td = cells[col][row];
                td.innerHTML = "";
                td.classList.add("kq-cell-loading");
            }

            // ── Đặt kết quả vào ô, có animation pop-in ───────────────────
            function setCellColor(col, row, name) {
                const td = cells[col][row];
                td.classList.remove("kq-cell-loading");
                td.innerHTML = "";
                td.dataset.name = name || "";
                if (!name || !colorMap[name]) return; // bỏ trống

                const dot = document.createElement("span");
                dot.className = "kq-dot";
                dot.style.background = colorMap[name];
                dot.textContent = labelMap[name] || "";
                td.appendChild(dot);
            }

            // ── Đổ kết quả: clear → loading → chụp 1 lần → fill từng ô ───
            // Thứ tự: cột 1 hàng 1→6, cột 2 hàng 1→6, ...
            // Gặp 2 ô rỗng liên tiếp thì dừng, các ô còn lại để trống.
            async function doFetch() {
                // 1. Clear sạch toàn bộ ô ngay lập tức & xoá dữ liệu mảng cũ
                clearAllCells();
                window.KetQuaListTable = [];
                if (typeof window.FcSetKetQuaListTable === "function") {
                    try { await window.FcSetKetQuaListTable([]); } catch (_) { }
                }

                // 2. Đánh dấu tất cả ô là "đang chờ" (nhấp nháy)
                for (let c = 0; c < COLS; c++) {
                    for (let r = 0; r < ROWS; r++) {
                        setCellLoading(c, r);
                    }
                }

                // 3. Chụp 1 lần cả bảng (thứ tự: cột 1 hàng 1→6, cột 2 hàng 1→6, ...)
                const cellsList = [];
                for (let c = 0; c < COLS; c++) {
                    for (let r = 0; r < ROWS; r++) {
                        cellsList.push({ x: colX[c], y: rowY[r] });
                    }
                }

                let names = [];
                for (let i = 0; i < attempts; i++) {
                    try { names = await window.Fc_checkGrid(cellsList); } catch (_) { names = []; }
                    if (names.some(Boolean)) break;
                    if (i < attempts - 1) {
                        await new Promise((resolve) => setTimeout(resolve, retryDelay));
                    }
                }

                // 4. Fill từng ô & gom vào mảng KetQuaListTable.
                //    Gặp 2 ô rỗng liên tiếp thì dừng (coi như xong 24 ô)
                const collectedResults = [];
                try {
                    let emptyStreak = 0;
                    for (let i = 0; i < cellsList.length; i++) {
                        const c = Math.floor(i / ROWS);
                        const r = i % ROWS;
                        const resultName = names[i] || null;
                        setCellColor(c, r, resultName);

                        if (resultName) {
                            collectedResults.push(resultName);
                            emptyStreak = 0;
                        } else {
                            emptyStreak++;
                        }

                        if (emptyStreak >= 2) break;
                    }

                    // Lưu mảng kết quả vào KetQuaListTable trong ketQuaState.js và window
                    window.KetQuaListTable = collectedResults;

                    // Fill  bảng TX cập nhật cùng (đường này không đi qua updateUI_KetQuaList)
                    if (typeof window.updateUI_Table_TX === "function") window.updateUI_Table_TX(collectedResults);

                    if (typeof window.FcSetKetQuaListTable === "function") {
                        try { await window.FcSetKetQuaListTable(collectedResults); } catch (_) { }
                    }
                } finally {
                    // Đảm bảo không còn ô nào nhấp nháy sót lại
                    for (let c = 0; c < COLS; c++) {
                        for (let r = 0; r < ROWS; r++) {
                            cells[c][r].classList.remove("kq-cell-loading");
                        }
                    }
                }
            }

            window.updateUI_KetQuaList = (list) => {
                const safeList = Array.isArray(list) ? list : [];
                window.KetQuaListTable = safeList.slice();
                // Push kết quả mới (hoặc xóa bằng mảng rỗng) -> bảng TX cập nhật cùng bảng chính
                if (typeof window.updateUI_Table_TX === "function") window.updateUI_Table_TX(safeList);
                for (let i = 0; i < COLS * ROWS; i++) {
                    const c = Math.floor(i / ROWS);
                    const r = i % ROWS;
                    const td = cells[c][r];
                    const name = safeList[i] || null;

                    if ((td.dataset.name || "") === (name || "")) continue; // không đổi → khỏi vẽ lại

                    setCellColor(c, r, name);
                }
            };

            window.clearUI_KetQuaList = () => {
                clearAllCells();
                window.KetQuaListTable = [];
                // Xóa bảng chính thì bảng TX cũng xóa theo (truyền mảng rỗng)
                if (typeof window.updateUI_Table_TX === "function") window.updateUI_Table_TX([]);
            };

            // Cho file khác (UI_Vao_Phong_Choi.js) gọi: await window.KicHoat_LayKetQua_Fill_TabeList()
            window.KicHoat_LayKetQua_Fill_TabeList = doFetch;
        },
        {
            colX: COL_X, rowY: ROW_Y,
            colorMap: COLOR_MAP, labelMap: LABEL_MAP,
            attempts: ATTEMPTS, retryDelay: RETRY_DELAY_MS,
        }
    );
}

module.exports = { UI_KetQuaList };