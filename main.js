// main.js – Entry point: khởi động browser và điều phối trò chơi
"use strict";

const { chromium } = require("playwright");
require("dotenv").config();

const { UI_TableKiemthu } = require("./src/UI_TableKiemthu");
const { UI_KetQuaList } = require("./src/UI_KetQuaList");
const { UI_Vao_Phong_Choi } = require("./src/UI_Vao_Phong_Choi");
const { UI_Dashboard, updateDashboard } = require("./src/UI/DashboardUI");
const { setupExposeFunctions } = require("./src/setupExposeFunctions");
const { loadStateTXT, captureItems, IMAGES_DIR } = require("./src/captureState");

const { CheckChay2Ngam } = require("./src/util/CheckChay2Ngam");
const { LayTinHieu } = require("./src/util/Laytinhieu ");
const { ChuyenPhong } = require("./src/util/ChuyenPhong");
const { checkOnce } = require("./src/util/checker");
const { GiamSatTrangThai, DungGiamSat, TiepTucGiamSat, } = require("./src/util/GiamSatPhong");
const { HandleAddResultToList, HandleClearKetQuaList } = require("./src/util/HandleAddResultToList");
const { showThongBao, cancelThongBao } = require("./src/UI_ThongBao");
const { TOA_DO, KE_HOACH, HOA_HONG_RED, CLICK_DELAY_MS, DS_TRANG_THAI, THEP_CUOI } = require("./src/config/CuocConfig");

// ── Trạng thái phòng (object tham chiếu, truyền vào GiamSatTrangThai) ────────
const roomState = {
    TrongRoomReady: false,    // Cờ: bot đang ở trong phòng (giám sát chạy) – set true ngay khi vào, false khi thoát
    khoaVongLap: false,       // Khóa tránh chạy 2 vòng lặp giám sát cùng lúc
    trangThaiHienTai: null,
    daFill24O: false,         // Cờ: Đã fill 24 ô đúng thời điểm thành công chưa
    daDatCuocTrongVan: false, // Đánh dấu bot có đặt cược ván này (để tắt popup chờ mở bài)
    daPush_KetQua: false,     // Đánh dấu đã push kết quả của ván này vào bảng (chặn push 2 lần)
    yeuCauDung: false,        // Cờ: Người dùng bấm dừng bot

    // ── Dữ liệu cho Dashboard ──
    tinHieu: null,            // Tín hiệu bot cho ván này: "red" | "blue" | null (không có tín hiệu)
    soTien: 1000,             // Số tiền hiện tại (đặt cược là trừ luôn, cho phép âm)
    lai: 0,                   // Tổng lãi/lỗ: thắng cộng lãi ròng, thua trừ tiền cược, hòa cộng 0
    cuoc: null,               // Cược đang chờ kết quả: { ben: "red"|"blue", thep: 1|2|3, tien } – null là chưa đặt

    chuKiThang: 0,            // Số chu kì thắng hiện tại (tử số). Thắng +1, thua ở thép cuối -1, cho phép âm
    mucTieuChuKi: 5,          // Mục tiêu chu kì thắng (mẫu số), sửa bằng input Dashboard. <=0 là tắt
    laiHienTai: 0,            // Lãi tích lũy so với mục tiêu lãi (reset khi thoát phòng). Khác "lai" là tổng
    mucTieuLai: 100,          // Mục tiêu lãi, sửa bằng input Dashboard. <=0 là tắt
};



const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const lamTron = (n) => Math.round(n * 100) / 100;

const capNhatDashboard = (page) => updateDashboard(page, roomState);

// Đủ mục tiêu: đủ chu kì thắng HOẶC đủ lãi
const datMucTieu = () =>
    (roomState.mucTieuChuKi > 0 && roomState.chuKiThang >= roomState.mucTieuChuKi) ||
    (roomState.mucTieuLai > 0 && roomState.laiHienTai >= roomState.mucTieuLai);

// Reset 2 bộ đếm về 0 (gọi khi thoát phòng)
function resetMucTieu(page) {
    roomState.chuKiThang = 0;
    roomState.laiHienTai = 0;
    capNhatDashboard(page);
}

// =========== MAIN – CHƯƠNG TRÌNH CHÍNH ==================
(async () => {
    loadStateTXT();

    const browser = await chromium.launch({
        headless: false,
        args: ["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"],
    });
    const page = await browser.newPage();
    await page.goto(process.env.X_URL, { waitUntil: "networkidle", timeout: 15 * 60 * 1000 });

    await setupExposeFunctions(page);

    // await UI_TableKiemthu(page);
    await UI_KetQuaList(page);
    await UI_Vao_Phong_Choi(page);
    await UI_Dashboard(page, roomState);

    // Điểm vào từ browser sau khi xác nhận đã vào phòng
    await page.exposeFunction("FC_DaKiemChungVaoPhong", () => HandleDaKiemChungVaoPhong(page));
    await page.exposeFunction("FC_BatDauBot", () => HandleBatDauBot());
    await page.exposeFunction("FC_YeuCauDungBot", () => HandleYeuCauDungBot(page));
    await page.exposeFunction("FC_ThoatPhongVeSanh", () => ChuyenPhong(page, "⏹ Dừng bot, thoát về sảnh..."));
    await page.exposeFunction("FC_SetMucTieu", (loai, v) => {
        const n = Number(v);
        const val = Number.isFinite(n) ? n : 0;
        if (loai === "chuki") roomState.mucTieuChuKi = val;
        else if (loai === "lai") roomState.mucTieuLai = val;
        console.log(`[Room] 🎯 Đặt mục tiêu ${loai} = ${val}`);
    });
})();
// =========== HẾT MAIN ==================

function HandleBatDauBot() {
    console.log("[Room] ▶ Nhận lệnh Bắt đầu chạy bot.");
    roomState.yeuCauDung = false;
}

async function HandleYeuCauDungBot(page) {
    console.log("[Room] 🛑 Nhận yêu cầu dừng bot từ giao diện.");
    roomState.yeuCauDung = true;

    if (roomState.TrongRoomReady) {
        if (roomState.cuoc !== null) {
            showThongBao(page, "⏳ Đang đợi dừng - xong ván...Là tự Dừng", 5000, "#f59e0b");
            return { daNhan: true, dangDoiMoBai: true };
        } else {
            roomState.daFill24O = false;
            await HandleClearKetQuaList(page);
            try {
                await ChuyenPhong(page, "⏹ Dừng bot, thoát phòng...");
            } finally {
                roomState.TrongRoomReady = false;
            }
            return { daNhan: true, dangDoiMoBai: false };
        }
    } else {
        console.log("[Room] ⏹ Bot đang ở ngoài sảnh, đã dừng chu trình.");
        resetMucTieu(page);
        showThongBao(page, "⏹ Đã dừng bot!", 3000, "#ef4444");
        return { daNhan: true, dangDoiMoBai: false };
    }
}

// ─── Bước 1: Sau khi vào phòng – khởi động chế độ giám sát & kiểm chứng phòng ───────────
async function HandleDaKiemChungVaoPhong(page) {
    if (roomState.yeuCauDung) return false;

    roomState.TrongRoomReady = true;     // ← set true ngay để vòng giám sát chạy được
    roomState.trangThaiHienTai = null;
    roomState.daFill24O = false;
    roomState.daDatCuocTrongVan = false;
    roomState.daPush_KetQua = false;
    roomState.tinHieu = null;            // soTien và lai giữ nguyên qua các phòng
    roomState.cuoc = null;
    capNhatDashboard(page);

    // Khởi động vòng lặp giám sát nền (fire & forget)
    GiamSatTrangThai(page, DS_TRANG_THAI, roomState, (tt) => HandleDanhTienThat(page, tt));

    while (roomState.TrongRoomReady) await sleep(500);
    resetMucTieu(page); // Thoát phòng bằng cách nào cũng reset về 0/N
    return false;
}

// ─── Đảm bảo bảng 24 ô được fill đúng thời điểm ổn định (dùng chung cho ChucMayMan, CoHoiCuoiCung, DangChoMoBai) ─
async function damBaoDaFill24O(page, tt) {
    if (roomState.yeuCauDung) return false;
    if (roomState.daFill24O) return true; // Đã fill từ trước rồi thì không làm lại

    // showThongBao(page, `🔄 Lấy 24ô kết quả...`, 3000, "#eeff00ff");
    DungGiamSat();
    try {
        await page.evaluate(async () => {
            if (typeof window.KicHoat_LayKetQua_Fill_TabeList === "function") {
                await window.KicHoat_LayKetQua_Fill_TabeList();
            }
        });
        await sleep(700);
        roomState.daFill24O = true;
        // Kiểm tra điều kiện bàn chơi (Cháy 2 Ngầm) ngay sau khi fill 24 ô

        const isDat = CheckChay2Ngam();

        if (!isDat) {
            roomState.daFill24O = false;
            // await HandleClearKetQuaList(page);

            try {
                await ChuyenPhong(page, "⚠️ Không đạt điều kiện, chuyển phòng...");
            } finally {
                roomState.TrongRoomReady = false; // ← đặt SAU ChuyenPhong, trong finally để lỗi cũng không kẹt
            }
            return false;
        }
        return true;
    } finally {
        TiepTucGiamSat();
    }
}

// ─── Bước 2: Xử lý theo trạng thái (gọi mỗi khi state đổi) ────────
async function HandleDanhTienThat(page, tt) {
    if (!tt) tt = roomState.trangThaiHienTai;
    try {
        switch (tt) {

            // ── Thời gian đặt cược: Kiểm tra fill 24 ô và tiến hành cược ─
            case "ChucMayMan": {
                if (roomState.daDatCuocTrongVan) {
                    break;
                }

                if (roomState.yeuCauDung) {
                    roomState.daFill24O = false;
                    await HandleClearKetQuaList(page);
                    try {
                        await ChuyenPhong(page, "⏹ Dừng bot, thoát phòng...");
                    } finally {
                        roomState.TrongRoomReady = false;
                    }
                    return;
                }

                // Ván mới bắt đầu -> Reset cờ cược trong ván
                roomState.daDatCuocTrongVan = false;
                roomState.daPush_KetQua = false;
                const datKiemTra = await damBaoDaFill24O(page, tt);
                if (!datKiemTra || roomState.yeuCauDung) return;



                DungGiamSat();
                try {
                    await xuLyDatCuoc(page);
                } finally {
                    await sleep(20000);// saukhi Đặt cược chờ tới lúc mở bài còn lâu , đở phải chụp check thêm
                    TiepTucGiamSat();
                }
                break;
            }

            case "CoHoiCuoiCung": {
                if (roomState.daDatCuocTrongVan) {
                    break; // Ván này đã cược lúc Chúc May Mắn rồi thì không lặp lại
                }

                if (roomState.yeuCauDung && roomState.cuoc === null) {
                    roomState.daFill24O = false;
                    await HandleClearKetQuaList(page);
                    try {
                        await ChuyenPhong(page, "⏹ Dừng bot, thoát phòng...");
                    } finally {
                        roomState.TrongRoomReady = false;
                    }
                    return;
                }

                roomState.daPush_KetQua = false;
                const datKiemTra = await damBaoDaFill24O(page, tt);
                if (!datKiemTra || roomState.yeuCauDung) return;



                DungGiamSat();
                try {
                    await xuLyDatCuoc(page);
                } finally {

                    await sleep(10000);// saukhi Đặt cược chờ tới lúc mở bài còn lâu , đở phải chụp check thêm
                    TiepTucGiamSat();
                }
                break;
            }

            // ── Bàn đang chuẩn bị mở bài: Chỉ fill 24 ô nếu chưa fill, KHÔNG đặt cược ─
            case "DangChoMoBai": {
                roomState.daPush_KetQua = false;

                const datKiemTra = await damBaoDaFill24O(page, tt);
                if (!datKiemTra) return;

                break;
            }

            // ── Phát hiện kết quả mở bài ────────────────────────────────
            case "Green_Hoa":
            case "Red_Win":
            case "Blue_Win": {
                // Nếu mới vào phòng mà gặp ngay kết quả cũ (daFill24O === false) -> BỎ QUA!
                if (!roomState.daFill24O || roomState.daPush_KetQua) {
                    break;
                }

                // Tắt popup "Chờ mở bài" nếu có
                if (roomState.daDatCuocTrongVan) {
                    cancelThongBao(page);
                    roomState.daDatCuocTrongVan = false;
                }

                DungGiamSat();
                try {
                    await xuLyKetQua(page, tt);
                } finally {
                    TiepTucGiamSat();
                }

                // Đủ mục tiêu (chu kì thắng HOẶC lãi) -> thoát phòng, đi tìm phòng khác
                if (datMucTieu()) {
                    showThongBao(page, `🏆 Đạt mục tiêu (${roomState.chuKiThang}/${roomState.mucTieuChuKi} chu kì, lãi ${roomState.laiHienTai}/${roomState.mucTieuLai}) → thoát phòng`, 5000, "#22c55e");
                    roomState.daFill24O = false;
                    await HandleClearKetQuaList(page);
                    try {
                        await ChuyenPhong(page, "🏆 Đạt mục tiêu, thoát phòng...");
                    } finally {
                        roomState.TrongRoomReady = false; // → chỗ 5 sẽ reset về 0, UI_Vao_Phong_Choi sang phòng tiếp
                    }
                    return;
                }

                // Xong ván cược: Nếu người dùng đã yêu cầu dừng -> dừng và thoát phòng

                if (roomState.yeuCauDung) {
                    roomState.daFill24O = false;
                    await HandleClearKetQuaList(page);
                    try {
                        await ChuyenPhong(page, "⏹ Đã xong ván! -> thoát phòng");
                    } finally {
                        roomState.TrongRoomReady = false;
                    }
                    return;
                }
                break;
            }

            // ── Bàn đang xáo bài: Thoát phòng và tiếp tục chuyển sang phòng khác ────────
            case "VuiLongCho_XaoBai": {
                console.log("[Room] 🔀 Trạng thái: VuiLongCho_XaoBai – Bàn đang xáo bài, thoát phòng để chuyển phòng khác...");
                if (roomState.daDatCuocTrongVan) cancelThongBao(page);
                roomState.daFill24O = false;
                roomState.daDatCuocTrongVan = false;
                roomState.tinHieu = null;
                roomState.cuoc = null;
                capNhatDashboard(page);
                await HandleClearKetQuaList(page);

                DungGiamSat();
                try {
                    const thongBao = roomState.yeuCauDung
                        ? "⏹ Dừng bot, thoát phòng..."
                        : "🔄 Bàn đang xáo bài, chuyển phòng khác...";
                    await ChuyenPhong(page, thongBao);
                } finally {
                    roomState.TrongRoomReady = false; // Kết thúc giám sát phòng hiện tại để UI_Vao_Phong_Choi chuyển phòng tiếp
                    TiepTucGiamSat();
                }
                return;
            }

            default:
                break;
        }
    } catch (_) { }
}

// ─── Click helper ───────────────────────────────────────────────────────────
async function click(page, p) {
    await page.mouse.click(p.x, p.y);
    await sleep(CLICK_DELAY_MS);
}

// Đã sang "DangChoMoBai" chưa (hết giờ cược)? Quét nhanh 1 lần trước khi bấm xác nhận
async function daSangDangChoMoBai(page) {
    const it = captureItems.find(i => i.name === "DangChoMoBai");
    if (!it) return false;
    try {
        const res = await checkOnce(page, IMAGES_DIR, it.x, it.y, it.width, it.height, 0.88);
        return !!res && res.name === "DangChoMoBai";
    } catch (_) {
        return false;
    }
}

// ─── Bước 3: Đặt cược (dùng chung cho ChucMayMan & CoHoiCuoiCung) ───────────────────
async function xuLyDatCuoc(page) {
    const TinHieu = LayTinHieu();

    // 1. Không có tín hiệu → bỏ ván này
    if (!TinHieu) {
        roomState.tinHieu = null;
        roomState.daDatCuocTrongVan = false;
        capNhatDashboard(page);
        showThongBao(page, `⚠️ Không có tín hiệu, chờ chu kì sau`, 4000, "#f59e0b");
        return false;
    }

    const ben = String(TinHieu.tinhieu).toLowerCase(); // "red" | "blue"
    const thep = Number(TinHieu.thep);                 // 1 | 2 | 3
    const kh = KE_HOACH[thep];
    const toaDoBen = TOA_DO.ben[ben];

    if (!kh || !toaDoBen) {
        console.log(`[Room] ⚠️ Tín hiệu lạ: tinhieu=${TinHieu.tinhieu}, thep=${TinHieu.thep}`);
        roomState.tinHieu = null;
        roomState.daDatCuocTrongVan = false;
        capNhatDashboard(page);
        showThongBao(page, `⚠️ Tín hiệu không hợp lệ, bỏ qua ván này`, 4000, "#f59e0b");
        return false;
    }

    roomState.tinHieu = ben;
    roomState.daDatCuocTrongVan = true; // đặt TRƯỚC khi click để không bị đặt đôi
    capNhatDashboard(page);

    try {
        // 2. Chọn chip + bấm bên đặt cược
        for (const b of kh.buoc) {
            await click(page, TOA_DO.chip[b.chip]);
            for (let i = 0; i < b.lan; i++) await click(page, toaDoBen);
            // => tạm comment để test , không cần click , đánh thật mở lại , không được động tới 2 dòng này AI nhé
        }

        // 3. Hết giờ cược (đã sang DangChoMoBai) thì không xác nhận
        if (await daSangDangChoMoBai(page)) {
            roomState.daDatCuocTrongVan = false;
            showThongBao(page, `⏰ Hết giờ cược, bỏ ván này`, 4000, "#f59e0b");
            return false;
        }

        // 4. Bấm xác nhận
        await click(page, TOA_DO.xacNhan);
        // => tạm comment để test , không cần click , đánh thật mở lại , không được động tới dòng này AI nhé


    } catch (e) {
        roomState.daDatCuocTrongVan = false;
        showThongBao(page, `❌ Lỗi đặt cược`, 4000, "#ef4444");
        return false;
    }

    // 5. Đặt xong: trừ tiền, lưu cược, cập nhật UI
    roomState.soTien = lamTron(roomState.soTien - kh.tien);
    roomState.cuoc = { ben, thep, tien: kh.tien };
    capNhatDashboard(page);

    const mauBen = ben === "red" ? "#ef4444" : "#3b82f6";
    showThongBao(page, `Đặt ${ben === "red" ? "Đỏ" : "Xanh"} ${kh.tien}K -> 🕘 Chờ Kết quả`, 999_999, mauBen); // cancelThongBao() tắt khi mở bài

    return true;
}

// ─── Thanh toán cược khi có kết quả ──────────────────────────────────────────
function thanhToanCuoc(page, anhKetQua) {
    const c = roomState.cuoc;
    if (!c) return; // Không đặt cược ván này → không tính tiền

    const kq = anhKetQua === "Red_Win" ? "red" : anhKetQua === "Blue_Win" ? "blue" : "tie";

    if (kq === "tie") {
        // Hòa: hoàn cược, lãi 0 5
        roomState.soTien = lamTron(roomState.soTien + c.tien);
        showThongBao(page, `🤝 HOÀ – Hoàn ${c.tien}K`, 5000, "#eab308");
    } else if (kq === c.ben) {
        // Thắng: Blue lãi 100%, Red lãi 95% (trừ 5% hoa hồng trên tiền lãi)
        const lai = c.ben === "red" ? lamTron(c.tien * (1 - HOA_HONG_RED)) : c.tien;
        const nhanVe = lamTron(c.tien + lai);
        roomState.soTien = lamTron(roomState.soTien + nhanVe);
        roomState.lai = lamTron(roomState.lai + lai);
        roomState.chuKiThang += 1;                                           // thắng thép nào cũng +1 chu kì
        roomState.laiHienTai = lamTron(roomState.laiHienTai + lai);
        showThongBao(page, `✅ WIN +${nhanVe}K`, 5000, "#22c55e");
    } else {
        // Thua: tiền cược đã trừ lúc đặt, chỉ trừ lãi
        roomState.lai = lamTron(roomState.lai - c.tien);
        // if (c.thep === THEP_CUOI) roomState.chuKiThang -= 1;                 // thua ở thép cuối: -1 chu kì
        roomState.laiHienTai = lamTron(roomState.laiHienTai - c.tien);
        showThongBao(page, `❌ THUA -${c.tien}K`, 5000, "#ef4444");
    }

    roomState.cuoc = null;
    roomState.tinHieu = null;
    capNhatDashboard(page);
}

// ─── Xử lý kết quả mở bài ───────────────────────────────────────────────────
async function xuLyKetQua(page, anhKetQua) {
    // Tính tiền trước (chỉ chạy khi có cược, xong là cuoc = null nên không tính 2 lần)
    thanhToanCuoc(page, anhKetQua);

    switch (anhKetQua) {
        case "Green_Hoa":
            showThongBao(page, `🟢 KẾT QUẢ – Hoà`, 4000, "#37dc3fff");

            if (roomState.daFill24O) {
                roomState.daPush_KetQua = true;
                await HandleAddResultToList(page, "KetQua_Tie");
            }
            break;
        case "Red_Win":
            showThongBao(page, `🔴 KẾT QUẢ – Đỏ Thắng`, 4000, "#ff0808ff");

            if (roomState.daFill24O) {
                roomState.daPush_KetQua = true;
                await HandleAddResultToList(page, "KetQua_Banker");
            }
            break;
        case "Blue_Win":
            showThongBao(page, `🔵 KẾT QUẢ – Xanh Thắng`, 4000, "#3a37dcff");
            if (roomState.daFill24O) {
                roomState.daPush_KetQua = true;
                await HandleAddResultToList(page, "KetQua_Player");
            }
            break;
        default:
            console.log("⚠️ Trạng thái kết quả lạ:", anhKetQua);
            break;
    }
    await sleep(3000);
}

module.exports = { HandleDaKiemChungVaoPhong };