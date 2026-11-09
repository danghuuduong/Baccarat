"use strict";

const fs = require("fs");
const path = require("path");

const CSS_PATH = path.join(__dirname, "CSS", "UI_Table_TX.css");

// UI_Table_TX.js – Bảng cầu Đỏ/Xanh: 24 cột × 6 hàng, nền trắng kẻ ô giống 
// Luật: bỏ Hòa; cùng màu ván trước thì xuống hàng, khác màu thì sang cột mới.
// Cột có từ 6 ván trở lên: hàng 1-5 là chấm, hàng 6 hiện +1, +2, +3...
// Có nút ▼/▲ để ẩn/hiện bảng (dữ liệu vẫn cập nhật phía sau).

async function UI_Table_TX(page) {
    if (!page) return;
    const cssText = fs.readFileSync(CSS_PATH, "utf8");

    await page.evaluate((cssText) => {
        if (document.getElementById("ui-bang-moi")) return;

        const COLS = 24;
        const ROWS = 6;

        // ── STYLE ──────────────────────────────────────────────────────────
        let style = document.getElementById("css-ui-table-tx");
        if (!style) {
            style = document.createElement("style");
            style.id = "css-ui-table-tx";
            document.head.appendChild(style);
        }
        style.textContent = cssText;

        // ── DOM: bảng 24 cột × 6 hàng ──────────────────────────────────────
        const root = document.createElement("div");
        root.id = "ui-bang-moi";
        root.style.position = "fixed";
        root.style.pointerEvents = "none";

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
    }, cssText);
}

module.exports = { UI_Table_TX };