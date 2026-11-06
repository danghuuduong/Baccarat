"use strict";

// UI_Table_TX.js – Bảng cầu Đỏ/Xanh: 24 cột × 6 hàng, nền trắng kẻ ô giống UI_KetQuaList
// Luật: bỏ Hòa; cùng màu ván trước thì xuống hàng, khác màu thì sang cột mới.
// Cột có từ 6 ván trở lên: hàng 1-5 là chấm, hàng 6 hiện +1, +2, +3...
// Có nút ▼/▲ để ẩn/hiện bảng (dữ liệu vẫn cập nhật phía sau).

async function UI_Table_TX(page) {
    await page.evaluate(() => {
        if (document.getElementById("ui-bang-moi")) return;

        const COLS = 24;
        const ROWS = 6;
        const CELL = 19;          // kích thước ô (px), đổi ở đây nếu muốn to/nhỏ
        const DOT = CELL - 2;     // kích thước chấm

        // ── STYLE ──────────────────────────────────────────────────────────
        const style = document.createElement("style");
        style.textContent = `
            #ui-bang-moi {
                position: fixed;
                top: 38px;                 /* cùng hàng với bảng 9 phòng */
                left: calc(50% + 126px);   /* ngay bên phải bảng 9 phòng */
                z-index: 99901;
                pointer-events: none;
                background: rgba(255,255,255,0.92);
                border: 1px solid #555;
                border-radius: 6px;
                padding: 1px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.22);
                font-family: monospace;
            }
            #ui-bang-moi table { border-collapse: collapse; }
            #ui-bang-moi td {
                width: ${CELL}px;
                height: ${CELL}px;
                border: 1px solid #bbb;
                text-align: center;
                vertical-align: middle;
                background: #f8f8f8;
                padding: 0;
            }

            /* Chấm B / P giống UI_KetQuaList */
            #ui-bang-moi .tx-dot {
                display: inline-block;
                width: ${DOT}px;
                height: ${DOT}px;
                line-height: ${DOT}px;
                border-radius: 50%;
                color: #fff;
                font-size: 10px;
                font-weight: bold;
                font-family: monospace;
                text-align: center;
                vertical-align: middle;
                animation: tx-popin 0.22s ease-out both;
            }

            /* Ô "+n": viên tròn viền màu cột, nền nhạt cùng tông, số đậm */
            #ui-bang-moi .tx-more {
                display: inline-block;
                width: ${DOT}px;
                height: ${DOT}px;
                line-height: ${DOT - 3}px;
                border-radius: 50%;
                border: 1.5px solid var(--c);
                background: color-mix(in srgb, var(--c) 16%, #fff);
                color: var(--c);
                font-size: 9px;
                font-weight: 800;
                letter-spacing: -0.5px;
                font-family: monospace;
                text-align: center;
                vertical-align: middle;
                animation: tx-popin 0.22s ease-out both;
            }

            @keyframes tx-popin {
                0%   { transform: scale(0);    opacity: 0; }
                70%  { transform: scale(1.25); opacity: 1; }
                100% { transform: scale(1);    opacity: 1; }
            }

            /* Nút ẩn/hiện, nằm ngay trên bảng (bảng có pointer-events:none nên nút tách riêng) */
            #ui-bang-moi-toggle {
                position: fixed;
                top: 16px;
                left: calc(50% + 126px);
                z-index: 99902;
                padding: 1px 8px;
                background: #fff;
                border: 1px solid #999;
                border-radius: 4px;
                cursor: pointer;
                font: 11px monospace;
                user-select: none;
            }
        `;
        document.head.appendChild(style);

        // ── DOM: bảng 24 cột × 6 hàng ──────────────────────────────────────
        const root = document.createElement("div");
        root.id = "ui-bang-moi";

        const table = document.createElement("table");
        const cells = []; // cells[col][row]
        for (let r = 0; r < ROWS; r++) {
            const tr = document.createElement("tr");
            for (let c = 0; c < COLS; c++) {
                if (!cells[c]) cells[c] = [];
                const td = document.createElement("td");
                td.dataset.key = "";
                cells[c][r] = td;
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
        root.appendChild(table);
        document.body.appendChild(root);

        // ── Nút ẩn/hiện ────────────────────────────────────────────────────
        const toggle = document.createElement("div");
        toggle.id = "ui-bang-moi-toggle";
        toggle.textContent = "▼";
        toggle.title = "Ẩn/hiện bảng cầu";
        let isHidden = false;
        toggle.onclick = () => {
            isHidden = !isHidden;
            root.style.display = isHidden ? "none" : "block";
            toggle.textContent = isHidden ? "▲" : "▼";
        };
        document.body.appendChild(toggle);

        // Đỏ = Banker (B), Xanh = Player (P) – cùng màu với UI_KetQuaList
        const COLOR = { KetQua_Banker: "#ef4444", KetQua_Player: "#2563eb" };
        const LABEL = { KetQua_Banker: "B", KetQua_Player: "P" };

        // Chỉ vẽ lại ô nào khác lần trước (ô cũ không bị chớp animation)
        function setCell(td, key, build) {
            if (td.dataset.key === key) return;
            td.dataset.key = key;
            td.innerHTML = "";
            if (key && build) td.appendChild(build());
        }

        // ── Vẽ ─────────────────────────────────────────────────────────────
        // Được UI_KetQuaList gọi mỗi khi mảng kết quả đổi (fill / push / xóa)
        window.updateUI_Table_TX = (list) => {
            const arr = Array.isArray(list) ? list : [];

            // 1. Bỏ Hòa (và tên lạ), giữ thứ tự cũ → mới
            const kq = arr.filter((n) => n === "KetQua_Banker" || n === "KetQua_Player");

            // 2. Gom thành các cột: cùng màu ván trước thì cộng vào cột hiện tại, khác màu thì mở cột mới
            const cols = []; // [{ name, count }]
            for (const n of kq) {
                const last = cols[cols.length - 1];
                if (last && last.name === n) last.count++;
                else cols.push({ name: n, count: 1 });
            }

            // Quá 24 cột thì chỉ lấy 24 cột mới nhất (phòng hờ)
            const hienThi = cols.slice(-COLS);

            // 3. Tính nội dung mong muốn của từng ô rồi cập nhật ô nào đổi
            for (let c = 0; c < COLS; c++) {
                const col = hienThi[c];
                for (let r = 0; r < ROWS; r++) {
                    const td = cells[c][r];

                    if (!col) { setCell(td, ""); continue; }

                    const color = COLOR[col.name];

                    // Hàng 1-5: chấm B/P
                    if (r < 5) {
                        if (r < col.count) {
                            setCell(td, "dot:" + col.name, () => {
                                const d = document.createElement("span");
                                d.className = "tx-dot";
                                d.style.background = color;
                                d.textContent = LABEL[col.name];
                                return d;
                            });
                        } else {
                            setCell(td, "");
                        }
                        continue;
                    }

                    // Hàng 6: chấm thứ 6 trở đi hiện +1, +2, +3...
                    if (col.count >= 6) {
                        const so = col.count - 5;
                        setCell(td, "more:" + col.name + ":" + so, () => {
                            const m = document.createElement("span");
                            m.className = "tx-more";
                            m.style.setProperty("--c", color);
                            m.textContent = "+" + so;
                            return m;
                        });
                    } else {
                        setCell(td, "");
                    }
                }
            }
        };

        // Vẽ lần đầu theo mảng hiện có
        window.updateUI_Table_TX(window.KetQuaListTable || []);
    });
}

module.exports = { UI_Table_TX };