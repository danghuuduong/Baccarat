// UI_Vao_Phong_Choi.js – Giao diện chọn phòng Baccarat
// Gồm: nút "Bắt Đầu" top:0 giữa màn hình, bảng 9 ô Room hiện sẵn bên dưới.

"use strict";

const { ROOMS } = require("./config/RoomConfig");

async function UI_Vao_Phong_Choi(page) {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // Hàm cứu hộ chạy từ Node.js (Playwright) khi nút tự biến đổi thành màu xanh
    await page.exposeFunction("FC_KhoiPhucVaBatDauLai", async () => {
        try {
            await page.mouse.click(38, 38);
            await sleep(7000);
            await page.mouse.click(350, 327);
            await sleep(15000);
            await page.mouse.click(400, 200);
            await sleep(15000);
            await page.mouse.click(650, 21);//Bấm button Start
            return true;
        } catch (err) {
            return false;
        }
    });

    await page.exposeFunction("playwrightClick", async (x, y) => {
        try {
            await page.mouse.click(Math.round(x), Math.round(y));
            return { success: true };
        } catch (err) {
            console.error("❌ playwrightClick lỗi:", err.message);
            return { success: false, error: err.message };
        }
    });

    await page.evaluate((rooms) => {
        if (document.getElementById("ui-phong-choi")) return;

        // ── STYLE ──────────────────────────────────────────────────────────
        const style = document.createElement("style");
        style.textContent = `
            #ui-phong-choi * { box-sizing: border-box; }

            /* ─── Nút Bắt Đầu – cố định top:0 giữa màn hình ngang ─── */
            #ui-pc-btn-start {
                position: fixed;
                top: 0px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 99901;
                pointer-events: all;
                height: 35px;
                padding: 0 28px;
                background: #16a34a;
                color: #fff;
                border: none;
                border-radius: 0 0 8px 8px;
                font-size: 13px;
                font-weight: bold;
                font-family: monospace;
                cursor: pointer;
                box-shadow: 0 3px 12px rgba(22,163,74,0.45);
                transition: background .18s, box-shadow .18s;
                letter-spacing: 1px;
                white-space: nowrap;
            }
            #ui-pc-btn-start:hover   { background: #15803d; }
            #ui-pc-btn-start.running {
                background: #dc2626;
                box-shadow: 0 3px 12px rgba(220,38,38,0.45);
            }
            #ui-pc-btn-start.running:hover { background: #b91c1c; }
            #ui-pc-btn-start.stopping {
                background: #d97706 !important;
                box-shadow: 0 3px 12px rgba(217,119,6,0.45) !important;
            }
            #ui-pc-btn-start:active  { opacity: .85; }
            #ui-pc-btn-start:disabled {
                cursor: not-allowed;
                opacity: 0.85;
            }

            /* ─── Bảng 9 phòng – cố định top:38px giữa màn hình ngang ─── */
            #ui-pc-grid {
                position: fixed;
                top: 38px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 99901;
                pointer-events: none;
                display: grid;
                grid-template-columns: repeat(3, 72px);
                grid-template-rows: repeat(3, 32px);
                gap: 4px;
                background: rgba(15, 23, 42, 0.88);
                border: 1px solid #334155;
                border-radius: 0 0 8px 8px;
                padding: 6px 8px 8px 8px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.45);
            }

            .ui-pc-room {
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                border: 1.5px solid #475569;
                background: #1e293b;
                color: #94a3b8;
                font-size: 10px;
                font-weight: bold;
                font-family: monospace;
                user-select: none;
                transition: background .2s, color .2s, border-color .2s, box-shadow .2s;
            }

            /* Phòng đang được chọn / đang chạy */
            .ui-pc-room.active {
                background: #166534;
                border-color: #22c55e;
                color: #bbf7d0;
                box-shadow: 0 0 8px rgba(34,197,94,0.5);
            }

            /* Phòng đã duyệt xong */
            .ui-pc-room.done {
                background: #1e3a5f;
                border-color: #3b82f6;
                color: #93c5fd;
            }
        `;
        document.head.appendChild(style);

        // ── DOM ─────────────────────────────────────────────────────────────
        const root = document.createElement("div");
        root.id = "ui-phong-choi";

        // Nút Bắt Đầu
        const btnStart = document.createElement("button");
        btnStart.id = "ui-pc-btn-start";
        btnStart.textContent = "▶ Bắt Đầu";

        // Lưới 9 phòng – hiện sẵn
        const grid = document.createElement("div");
        grid.id = "ui-pc-grid";

        const roomEls = [];
        rooms.forEach((room) => {
            const cell = document.createElement("div");
            cell.className = "ui-pc-room";
            cell.textContent = `Room ${room.id}`;
            cell.dataset.roomId = room.id;
            grid.appendChild(cell);
            roomEls.push(cell);
        });

        root.appendChild(btnStart);
        root.appendChild(grid);
        document.body.appendChild(root);

        // ── STATE ─────────────────────────────────────────────────────────
        let isRunning = false;
        let yeuCauDung = false;
        let activeIndex = -1;

        // Giấc ngủ có thể bị ngắt ngay lập tức khi bấm Dừng
        const interruptibleSleep = async (ms) => {
            const end = Date.now() + ms;
            while (Date.now() < end) {
                if (yeuCauDung) break;
                await new Promise((r) => setTimeout(r, 100));
            }
        };

        // ── Helpers ───────────────────────────────────────────────────────
        function resetRooms() {
            roomEls.forEach((el) => el.classList.remove("active", "done"));
        }

        function setActive(idx) {
            activeIndex = idx;
            roomEls.forEach((el, i) => {
                el.classList.remove("active");
                if (i < idx) el.classList.add("done");
                else el.classList.remove("done");
            });
            if (idx >= 0 && idx < roomEls.length) {
                roomEls[idx].classList.add("active");
            }
        }

        // ── Vào phòng: click toạ độ tiêu điểm ────────────────────────────
        async function enterRoom(idx) {
            if (idx < 0 || idx >= rooms.length) return;
            const room = rooms[idx];
            setActive(idx);
            // console.log(`[PhongChoi] Click vào Room ${room.id} tại (${room.x}, ${room.y})`);
            try {
                await window.playwrightClick(room.x, room.y);
            } catch (e) {
                console.error(`[PhongChoi] Lỗi click Room ${room.id}:`, e.message || e);
            }
        }

        // ── Kiểm tra Exit_Room xem có đúng đã vào phòng chưa trong 15s để xác nhận đã vào phòng ────────
        async function waitForExitRoom(timeoutMs = 15000) {
            let info = null;
            if (typeof window.getImageInfo === "function") {
                try {
                    info = await window.getImageInfo("Exit_Room");
                } catch (_) { }
            }
            console.log(`[PhongChoi] Đang kiểm tra Exit_Room tại (${info.x}, ${info.y}, ${info.width}x${info.height}) trong tối đa ${timeoutMs / 1000}s...`);

            const startTime = Date.now();
            const intervalMs = 800;

            while (Date.now() - startTime < timeoutMs) {
                if (yeuCauDung) {
                    // console.log("[PhongChoi] Dừng chờ Exit_Room do nhận lệnh dừng.");
                    return false;
                }
                try {
                    const res = await window.Fc_checkOnceResult({
                        x: info.x,
                        y: info.y,
                        width: info.width,
                        height: info.height,
                    });

                    if (res && res.success && res.name === "Exit_Room") {
                        console.log(`[PhongChoi] ✅ Đã tìm thấy Exit_Room sau ${Math.round((Date.now() - startTime) / 1000)}s!`);
                        return true;
                    }
                } catch (err) {
                    console.error("[PhongChoi] Lỗi Fc_checkOnceResult:", err.message || err);
                }

                await new Promise((resolve) => setTimeout(resolve, intervalMs));
            }

            console.log("Chưa vào được Room, có lẽ do đường truyền mạng");
            return false;
        }

        // ── Sequence ─────────────────────────────────────────────────────
        async function runSequence() {
            resetRooms();

            for (let i = 0; i < rooms.length; i++) {
                if (yeuCauDung) break;

                await enterRoom(i);
                if (yeuCauDung) break;

                // Chờ và kiểm tra Exit_Room trong 15 giây
                const isEntered = await waitForExitRoom(15000);
                if (yeuCauDung) {
                    if (isEntered && typeof window.FC_ThoatPhongVeSanh === "function") {
                        try { await window.FC_ThoatPhongVeSanh(); } catch (_) { }
                    }
                    break;
                }
                if (!isEntered) {
                    break;
                }

                // === Thực hiện kiểm tra & đánh thật ===
                if (typeof window.FC_DaKiemChungVaoPhong === "function") {
                    const ketQuaDanh = await window.FC_DaKiemChungVaoPhong();

                    if (yeuCauDung) {
                        console.log("[PhongChoi] Đã dừng bot sau khi rời phòng.");
                        break;
                    }

                    if (ketQuaDanh === true) {
                        // ĐẠT -> Ở lại phòng này
                        break;
                    }

                    if (ketQuaDanh === "KHONG_TIM_THAY_SANH") {
                        console.log("[PhongChoi] Dừng lại do không tìm thấy sảnh chờ.");

                        break;
                    }

                    // KHÔNG ĐẠT (ketQuaDanh === false): đã thoát ra sảnh thành công -> chuyển phòng tiếp theo
                    await interruptibleSleep(1000);
                    if (yeuCauDung) break;

                    // Nếu đã đi hết 9 phòng thì xoá toàn bộ lịch sử và lặp lại từ Room 1
                    if (i === rooms.length - 1) {
                        resetRooms();
                        await interruptibleSleep(2000);
                        if (yeuCauDung) break;
                        i = -1; // Vòng lặp for sẽ i++ lên thành 0 (Room 1)
                    }
                }
            }

            console.log("[PhongChoi] Kết thúc lượt chạy.");
            const wasYeuCauDung = yeuCauDung; // chụp trước khi reset
            isRunning = false;
            yeuCauDung = false;
            resetRooms();
            btnStart.className = "";
            btnStart.disabled = false;
            btnStart.textContent = "▶ Bắt Đầu";

            // Tự động chạy cứu hộ & bấm lại Bắt Đầu nếu bot tự đổi thành màu xanh (không phải user bấm Dừng)
            if (!wasYeuCauDung) {
                console.log("[PhongChoi] 🔄 Bot tự dừng bất thường -> Kích hoạt cứu hộ & tự bấm lại Bắt Đầu...");

                if (typeof window.FC_KhoiPhucVaBatDauLai === "function") {
                    await window.FC_KhoiPhucVaBatDauLai();
                }

                // if (!isRunning) {
                //     btnStart.click(); có rồi
                // }
            }
        }

        // ──______________________________________ Nút Bắt Đầu / Dừng ──────────────────────────────────────────────────
        btnStart.addEventListener("click", async () => {
            if (!isRunning) {
                // Bắt đầu chạy
                isRunning = true;
                yeuCauDung = false;
                btnStart.className = "running";
                btnStart.textContent = "⏹ Dừng Lại";
                btnStart.disabled = false;

                if (typeof window.FC_BatDauBot === "function") {
                    try { await window.FC_BatDauBot(); } catch (_) { }
                }

                await runSequence();
            } else {
                // Yêu cầu dừng bot
                if (yeuCauDung) return;
                yeuCauDung = true;
                btnStart.className = "stopping";
                btnStart.disabled = true;
                btnStart.textContent = "⏳ Đang dừng...";

                if (typeof window.FC_YeuCauDungBot === "function") {
                    try {
                        const res = await window.FC_YeuCauDungBot();
                        if (res && res.dangDoiMoBai) {
                            btnStart.textContent = "⏳ Đợi hết ván để dừng...";
                        }
                    } catch (e) {
                        console.error("[PhongChoi] Lỗi FC_YeuCauDungBot:", e);
                    }
                }
            }
        });

    }, ROOMS);
}

module.exports = { UI_Vao_Phong_Choi };
