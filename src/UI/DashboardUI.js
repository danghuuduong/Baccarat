// src/UI/DashboardUI.js – Bảng thông tin đặt cược (góc trái, top 230px)
"use strict";

/**
 * Cập nhật dashboard từ roomState. Tự tạo panel nếu chưa có (kể cả khi trang bị load lại).
 */
function updateDashboard(page, rs) {
    if (!page) return Promise.resolve();
    const data = {
        tinHieu: rs.tinHieu ?? null,
        soTien: rs.soTien,
        lai: rs.lai,
        ben: rs.cuoc ? rs.cuoc.ben : null,
        thep: rs.cuoc ? rs.cuoc.thep : null,
        tien: rs.cuoc ? rs.cuoc.tien : null,
        chuKi: rs.chuKiThang,
        mucChuKi: rs.mucTieuChuKi,
        laiHT: rs.laiHienTai,
        mucLai: rs.mucTieuLai,
    };

    return page.evaluate((d) => {
        // 1. CSS (chèn 1 lần)
        if (!document.getElementById("ui-dashboard-style")) {
            const st = document.createElement("style");
            st.id = "ui-dashboard-style";
            st.textContent = `
                #ui-dashboard {
                    position: fixed;
                    top: 230px;
                    left: 0;
                    width: 235px;
                    padding: 8px 12px 8px 10px;
                    border-radius: 0 12px 12px 0;
                    background: rgba(15, 23, 42, 0.6);
                    -webkit-backdrop-filter: blur(12px) saturate(160%);
                    backdrop-filter: blur(12px) saturate(160%);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-left: 4px solid #38bdf8;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    color: #f1f5f9;
                    font: 600 12px/1.3 monospace;
                    z-index: 9997;
                    pointer-events: none;
                }
                #ui-dashboard .db-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    padding: 1px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                }
                #ui-dashboard .db-row:last-child { border-bottom: none; }
                #ui-dashboard .db-label { color: #94a3b8; white-space: nowrap; font-weight: 500; }
                #ui-dashboard .db-val { text-align: right; flex: 1; white-space: nowrap; transition: color .25s ease; }
                #ui-dashboard .db-input {
                    width: 54px;
                    height: 15px;
                    padding: 0 3px;
                    margin-left: 2px;
                    background: rgba(2, 6, 23, 0.7);
                    color: #f1f5f9;
                    border: 1px solid #475569;
                    border-radius: 4px;
                    font: 600 11px monospace;
                    text-align: center;
                    pointer-events: auto;
                    -moz-appearance: textfield;
                }
                #ui-dashboard .db-input:focus { outline: none; border-color: #38bdf8; }
                #ui-dashboard .db-input::-webkit-outer-spin-button,
                #ui-dashboard .db-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            `;
            document.head.appendChild(st);
        }

        // 2. Panel (tạo 1 lần)
        let panel = document.getElementById("ui-dashboard");
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "ui-dashboard";

            const rows = [
                ["signal", "Tín hiệu bot"],
                ["money", "Số tiền"],
                ["profit", "Lãi"],
                ["side", "Đặt cược bên"],
                ["thep", "Thếp"],
                ["bet", "Tiền cược"],
            ];
            for (const [k, label] of rows) {
                const row = document.createElement("div");
                row.className = "db-row";
                const l = document.createElement("span");
                l.className = "db-label";
                l.textContent = label;
                const v = document.createElement("span");
                v.className = "db-val";
                v.dataset.k = k;
                row.appendChild(l);
                row.appendChild(v);
                panel.appendChild(row);
            }

            // 2 dòng mục tiêu cuối bảng: [số hiện tại] / [input mục tiêu]
            const goalRows = [
                ["chuki", "Chu kì thắng"],
                ["lai", "Lãi mục tiêu"],
            ];
            for (const [k, label] of goalRows) {
                const row = document.createElement("div");
                row.className = "db-row";
                const l = document.createElement("span");
                l.className = "db-label";
                l.textContent = label;

                const v = document.createElement("span");
                v.className = "db-val";

                const cur = document.createElement("span");
                cur.dataset.k = k + "-cur";

                const inp = document.createElement("input");
                inp.type = "number";
                inp.className = "db-input";
                inp.dataset.k = k + "-max";
                inp.addEventListener("change", () => {
                    const n = Number(inp.value);
                    try {
                        Promise.resolve(
                            window.FC_SetMucTieu && window.FC_SetMucTieu(k, Number.isFinite(n) ? n : 0)
                        ).catch(() => { });
                    } catch (_) { }
                });

                v.appendChild(cur);
                v.appendChild(document.createTextNode(" / "));
                v.appendChild(inp);
                row.appendChild(l);
                row.appendChild(v);
                panel.appendChild(row);
            }

            document.body.appendChild(panel);
        }

        // 3. Đổ dữ liệu
        const fmt = (n) => {
            const r = Math.round(n * 100) / 100;
            return r.toLocaleString("en-US", { maximumFractionDigits: 2 });
        };
        const RED = "#ef4444", BLUE = "#3b82f6", GREEN = "#22c55e", GRAY = "#94a3b8", WHITE = "#f1f5f9";
        const set = (k, text, color) => {
            const el = panel.querySelector(`[data-k="${k}"]`);
            if (!el) return;
            el.textContent = text;
            el.style.color = color || WHITE;
        };
        // Không ghi đè input khi người dùng đang gõ
        const syncInput = (k, val) => {
            const el = panel.querySelector(`[data-k="${k}-max"]`);
            if (el && document.activeElement !== el) el.value = String(val);
        };
        const tenBen = (b) => (b === "red" ? "Red" : b === "blue" ? "Blue" : "Chưa");
        const mauBen = (b) => (b === "red" ? RED : b === "blue" ? BLUE : GRAY);

        // Tín hiệu
        if (d.tinHieu === "red" || d.tinHieu === "blue") {
            set("signal", tenBen(d.tinHieu), mauBen(d.tinHieu));
        } else {
            set("signal", "Không có tín hiệu", GRAY);
        }

        // Tiền & lãi
        set("money", fmt(d.soTien), d.soTien < 0 ? RED : WHITE);
        set("profit", (d.lai > 0 ? "+" : "") + fmt(d.lai), d.lai > 0 ? GREEN : d.lai < 0 ? RED : WHITE);

        // Cược hiện tại
        set("side", tenBen(d.ben), mauBen(d.ben));
        set("thep", d.thep == null ? "Chưa" : String(d.thep), d.thep == null ? GRAY : WHITE);
        set("bet", d.tien == null ? "Chưa" : fmt(d.tien), d.tien == null ? GRAY : WHITE);

        // Mục tiêu
        set("chuki-cur", String(d.chuKi), d.chuKi < 0 ? RED : d.chuKi > 0 ? GREEN : WHITE);
        set("lai-cur", fmt(d.laiHT), d.laiHT < 0 ? RED : d.laiHT > 0 ? GREEN : WHITE);
        syncInput("chuki", d.mucChuKi);
        syncInput("lai", d.mucLai);
    }, data).catch(() => { });
}

/** Gọi 1 lần trong main.js sau khi page sẵn sàng */
async function UI_Dashboard(page, rs) {
    await updateDashboard(page, rs);
}

module.exports = { UI_Dashboard, updateDashboard };