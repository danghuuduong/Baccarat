"use strict";
const { showThongBao, cancelThongBao } = require("../UI/UI_ThongBao");
const setting = require("../State/setting");
const { TimAnhDuaTrenListPop_Util } = require("./TimAnhDuaTrenListPop_Util");
const { DocKetQuaVang } = require("./DocKetQuaVang");
const { typeRoom, TaoDoChip_Room, ToaDoTab, TOA_DO_THOAT_PHONG, TRAO_BAI_IMG, SoTienThep } = require("../config/RoomConfig");
const { LayTinHieu } = require("./Laytinhieu_Util");
const { showLuoiBi, hideLuoiBi, showStats } = require("../UI/UI_InGame");
const { randomSleep, sleep } = require("./Sleep_Util");
const { DocKetQuaXanh } = require("./DocKetQuaXanh");
const { syncKetQua } = require("./syncStats");
const { CheckXanh3 } = require("./CheckChay2Ngam");

const round2 = (n) => Math.round(n * 100) / 100;

// ═══════════════════════════════════════════════════════════════════════════
//  THÉP: SoTienThep = [20, 50, 110, 220, 450]
//   - Đánh xanh theo thép hiện tại. Thua -> ở lại phòng chờ tín hiệu, lên thép kế.
//   - Thắng -> về thép 1, rời phòng.
//   - Thua hết thép cuối -> về thép 1, rời phòng.
// ═══════════════════════════════════════════════════════════════════════════

const TEN_BOT = "11-THEP";   // đổi nếu server sync cần tên khác
let thepIdx = 0;            // 0 = thép 1

// Thống kê lãi/lỗ THẬT (để tính tut = đỉnh - hiện tại)
const thongKeThat = { profit: 0, dinh: 0 };

function ghiThat(delta) {
    thongKeThat.profit = round2(thongKeThat.profit + delta);
    if (thongKeThat.profit > thongKeThat.dinh) thongKeThat.dinh = thongKeThat.profit;
    return round2(thongKeThat.dinh - thongKeThat.profit);
}

function buildStats() {
    return {
        soVonBanDau: setting.get("soVonBanDau"),
        SoTienLonNhatTungSoHuu: setting.get("SoTienLonNhatTungSoHuu"),
        profit: setting.get("profit"),
        solenhwin: setting.get("solenhwin"),
        solenhthua: setting.get("solenhthua"),
        solenhwin_Red: setting.get("solenhwin_Red"),
        solenhthua_Red: setting.get("solenhthua_Red"),
        solenhWin_Xanh: setting.get("solenhWin_Xanh"),
        solenhthua_Xanh: setting.get("solenhthua_Xanh"),

        thongkesolieuthep: setting.get("thongkesolieuthep"),

        soChuoiDat: setting.get("soChuoiDat"),
        TonThat_Max: setting.get("TonThat_Max"),
    };
}

// Mảng bi đang dùng để lấy tín hiệu
let arraySuDungChinhList = [];

// Kiểm tra xem người dùng đã bấm Dừng Lại chưa
const isDung = () => !setting.get("isRunButon");

// Sleep có thể ngắt ngay lập tức khi người dùng bấm Dừng Lại
async function sleepKiemTra(ms, step = 100) {
    const start = Date.now();
    while (Date.now() - start < ms) {
        if (isDung()) return false;
        const sleepTime = Math.min(step, ms - (Date.now() - start));
        await sleep(sleepTime);
    }
    return true;
}

async function outPhong(page, lyDo, cl = "#d7f706ff") {
    cancelThongBao(page);
    hideLuoiBi(page);
    arraySuDungChinhList = [];
    setting.set({
        isDatCuocXong: false,
        sotienuocHienTai: 0,
        bendat: null,
        danhSachTimKiemRa: [],
        phongRoomS: [],
        tabHienTai: 1,
    });
    showThongBao(page, `${lyDo}`, 6000, cl);
    await randomSleep(1500, 2000);
    const tab1 = ToaDoTab.find(t => t.tab === 1);
    await page.mouse.click(TOA_DO_THOAT_PHONG.x, TOA_DO_THOAT_PHONG.y);
    await randomSleep(70, 150);
    if (tab1) await page.mouse.click(Math.round(tab1.x), Math.round(tab1.y));
    setting.set("tabHienTai", 1);
    await randomSleep(333, 444);

    const isTypeHotUI = await TimAnhDuaTrenListPop_Util(page, ["HotUi"], 2000);
    if (isTypeHotUI) {
        for (let i = 1; i <= 3; i++) {
            await page.mouse.move(51, 370);
            await page.mouse.click(51, 370, { delay: 100 });
            await randomSleep(200, 333);

            // Kiểm tra nếu đã mất HotUi thì dừng click sớm
            const stillHot = await TimAnhDuaTrenListPop_Util(page, ["HotUi"], 700);
            if (!stillHot) {
                break;
            }
        }
    }

    // Chỉ tiếp tục chạy vòng lặp chụp màn hình nếu nút Bắt Đầu vẫn đang bật
    if (setting.get("isRunButon")) {
        setting.set("isStart", true);
        setTimeout(() => {
            const { vongLapChupManHinh } = require("./VongLapChupManHinh");
            vongLapChupManHinh(page);
        }, 444);
    } else {
        setting.set("isStart", false);
        setting.set("dangChay", false);
        showThongBao(page, "Đã dừng và out phòng an toàn", 5000, "#ff9900ff");
    }
}

async function xulyVoPhong_Util(page, danhSach) {
    if (isDung()) return;
    if (!danhSach || danhSach.length === 0) return;

    // Chọn phòng: random trong nhóm ưu tiên cao nhất
    const uuTienMax = Math.max(...danhSach.map(p => p.uutien));
    const nhomTot = danhSach.filter(p => p.uutien === uuTienMax);
    const phongTotNhat = nhomTot[Math.floor(Math.random() * nhomTot.length)];

    // ── Lần 1: Click vào phòng được chọn ──────────────────────────────────
    await page.mouse.click(
        Math.round(phongTotNhat.x),
        Math.round(phongTotNhat.y)
    );

    // Check loại phòng
    let roomType = await TimAnhDuaTrenListPop_Util(page, [typeRoom.room_a, typeRoom.room_b], 3000);

    if (isDung()) {
        await outPhong(page, "Đã bấm Dừng - Hủy vào phòng");
        return;
    }

    if (!roomType) {
        // ── Lần 2: Click lại + tìm thêm 2 giây ──────────────────────────────
        await page.mouse.click(
            Math.round(phongTotNhat.x),
            Math.round(phongTotNhat.y)
        );
        roomType = await TimAnhDuaTrenListPop_Util(page, [typeRoom.room_a, typeRoom.room_b], 2000);
    }

    if (isDung()) {
        await outPhong(page, "Đã bấm Dừng - Hủy vào phòng");
        return;
    }

    if (!roomType) {
        await outPhong(page, "Out Phòng- Không tìm được type Phòng");
        return;
    }

    // Lấy thẳng arr của phòng đã chọn
    arraySuDungChinhList = [...(phongTotNhat.arr || [])];

    // ── Phần đặt cược ─────────────────────────────────────────────────────
    const thongBao = `Phòng: ${phongTotNhat.phong} => 
     ${roomType === typeRoom.room_a ? "Sảnh Sexy" : "Sảnh Bacarat"}`;

    showThongBao(page, thongBao, 5000);

    // Hiển thị lưới bi + thống kê ban đầu
    showLuoiBi(page, arraySuDungChinhList);
    showStats(page, buildStats());

    await vongLapDatCuoc(page, roomType);

    return roomType;
}

// ─── Vòng lặp đặt cược chính ─────────────────────────────────────────────────
async function vongLapDatCuoc(page, roomType) {
    const coords = TaoDoChip_Room[roomType];

    // Di chuột tới điểm rồi mới click (để game nhận hover)
    const click = async (coord) => {
        const x = Math.round(coord.x), y = Math.round(coord.y);
        await page.mouse.move(x, y, { steps: 3 });
        await randomSleep(100, 150);
        await page.mouse.click(x, y);
    };

    // Chip ưu tiên số to trước
    const CHIP_THU_TU = [
        ["chip1000", 1000],
        ["chip500", 500],
        ["chip100", 100],
        ["chip50", 50],
        ["chip20", 20],
        ["chip10", 10],
    ];

    // Mỗi chip: chọn chip -> click bên cược
    async function datTien(tien, coordBen) {
        let con = tien;
        for (const [ten, gia] of CHIP_THU_TU) {
            while (con >= gia) {
                if (isDung()) return;
                // await click(coords[ten]); đang test xem hiểu quả không , nên comment 
                await randomSleep(222, 333);
                if (isDung()) return;
                // await click(coordBen); đang test xem hiểu quả không , nên comment 
                await randomSleep(222, 333);
                con -= gia;
            }
        }
    }

    // Poll LED vàng đến khi ra B/P/T hoặc hết timeout
    async function choKetQuaVang(timeoutMs) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (isDung()) return null;
            const r = await DocKetQuaVang(page, roomType);
            if (r) return r;
            await sleep(133);
        }
        return null;
    }

    async function choVanMoi(timeoutMs) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (isDung()) return false;

            // Thấy Trao Bài đúng type phòng thì return false
            // if (await TimAnhDuaTrenListPop_Util(page, [TRAO_BAI_IMG[roomType]], 200)) return false;

            if (await DocKetQuaXanh(page, roomType)) return true;
            const anh = await TimAnhDuaTrenListPop_Util(page, ["Status_BatDauVandau"], 200);
            if (anh) return true;
            await sleep(100);
        }
        return false;
    }

    const capNhatStats = () => {
        const tt = setting.get("SoTienLonNhatTungSoHuu") - setting.get("soVonBanDau");
        if (tt > setting.get("TonThat_Max")) setting.set("TonThat_Max", tt);
        showStats(page, buildStats());
    };

    while (setting.get("isRunButon")) {
        if (isDung()) {
            await outPhong(page, "Đã bấm Dừng - Thoát phòng");
            return;
        }

        // ── 1. Lấy tín hiệu ────────────────────────────────────────────────
        const vanMoi = await choVanMoi(8 * 60000);
        if (isDung()) { await outPhong(page, "Đã bấm Dừng khi chờ ván mới"); return; }
        if (!vanMoi) { await outPhong(page, "OutPhong -> Không tìm Bắt đầu ván mới - Hoặc Tráo Bài"); return; }

        const sach = arraySuDungChinhList.filter(x => x === "B" || x === "P");
        const tinHieu = LayTinHieu(sach);
        const kq = CheckXanh3(sach.slice(0, -2));
        const abc = tinHieu && kq.isOk;

        // Không có tín hiệu: ngồi chờ, đọc kết quả ván kế rồi lấy tín hiệu lại
        if (!abc) {
            showThongBao(page, "Chờ tín hiệu...", 5000, "#d7f706ff");
            const kqCho = await choKetQuaVang(6 * 60000);
            if (isDung()) { await outPhong(page, "Đã bấm Dừng khi chờ kết quả"); return; }
            if (!kqCho) { await outPhong(page, "OutPhong -> Không đọc được kết quả khi chờ tín hiệu"); return; }
            arraySuDungChinhList.push(kqCho);
            showLuoiBi(page, arraySuDungChinhList);
            continue;
        }

        if (isDung()) {
            await outPhong(page, "Đã bấm Dừng - Hủy cược");
            return;
        }

        // ── 2. Đặt xanh theo thép hiện tại ─────────────────────────────────
        const amount = SoTienThep[thepIdx];

        await randomSleep(50, 100);
        if (isDung()) { await outPhong(page, "Đã bấm Dừng - Hủy cược"); return; }

        await datTien(amount, coords.datCuoc_Blue);

        if (isDung()) { await outPhong(page, "Đã bấm Dừng - Hủy xác nhận cược"); return; }
        await randomSleep(200, 300);
        await click(coords.buttonXacNhan);

        setting.set({
            isDatCuocXong: true,
            sotienuocHienTai: amount,
            bendat: "blue",
            soVonBanDau: round2(setting.get("soVonBanDau") - amount),
        });
        capNhatStats();

        showThongBao(page, `Đặt ${amount}K - Thép ${thepIdx + 1}/${SoTienThep.length}`, 999999, "#247afbff");

        // ── 3. Chờ rồi tìm kết quả bằng LED vàng ───────────────────────────
        await sleepKiemTra(10000);
        const ketQua = await choKetQuaVang(7 * 60000);

        cancelThongBao(page);
        setting.set("isDatCuocXong", false);

        // ── 4. Không ra kết quả: coi như thua, out ─────────────────────────
        if (!ketQua) {
            if (isDung()) {
                await outPhong(page, "Đã bấm Dừng - Thoát phòng");
                return;
            }

            showThongBao(page, "Lỗi khi check kết quả", 5000, "#fb2424ff");
            setting.set("solenhthua", setting.get("solenhthua") + 1);
            setting.set("solenhthua_Xanh", setting.get("solenhthua_Xanh") + 1);
            setting.set("profit", round2(setting.get("profit") - amount));
            const tut = ghiThat(-amount);
            syncKetQua("thua", -amount, TEN_BOT, { khoiLuong: amount, phi: 0, tut, thep: thepIdx });

            thepIdx = thepIdx + 1 >= SoTienThep.length ? 0 : thepIdx + 1;
            capNhatStats();
            await outPhong(page, "OutPhong -> Không đọc được kết quả - coi như thua");
            return;
        }

        // ── 5. Xử lý kết quả: B / P / T ────────────────────────────────────
        setting.set({ bendat: null, sotienuocHienTai: 0 });

        arraySuDungChinhList.push(ketQua);
        showLuoiBi(page, arraySuDungChinhList);

        // Hòa: hoàn tiền, giữ nguyên thép, out
        if (ketQua === "T") {
            setting.set("soVonBanDau", round2(setting.get("soVonBanDau") + amount));
            capNhatStats();
            // await outPhong(page, "Hoà cút");
            // return;
            continue;
        }

        const thang = ketQua === "P";
        showThongBao(page, `${ketQua === "B" ? "Kết Quả -> ĐỎ" : "Kết Quả -> XANH "}`, 8000, ketQua === "B" ? "#fb2424ff" : "#018cffff");

        const delta = thang ? amount : -amount;

        if (thang) {
            setting.set("solenhwin", setting.get("solenhwin") + 1);
            setting.set("solenhWin_Xanh", setting.get("solenhWin_Xanh") + 1);
            setting.set("soVonBanDau", round2(setting.get("soVonBanDau") + amount * 2));
        } else {
            setting.set("solenhthua", setting.get("solenhthua") + 1);
            setting.set("solenhthua_Xanh", setting.get("solenhthua_Xanh") + 1);
        }
        setting.set("profit", round2(setting.get("profit") + delta));

        const tut = ghiThat(delta);
        const thepDaDanh = thepIdx;
        syncKetQua(thang ? "win" : "thua", delta, TEN_BOT, { khoiLuong: amount, phi: 0, tut, thep: thepDaDanh });
        capNhatStats();

        // ── 6. Thắng: về thép 1, out ───────────────────────────────────────
        if (thang) {
            thepIdx = 0;
            await outPhong(page, `✅ Chuồn thôi- Ăn +${amount}K`, "#00fd59ff");
            return;
        }

        // ── 7. Thua thép cuối: reset thép 1, out ───────────────────────────
        if (thepIdx + 1 >= SoTienThep.length) {
            thepIdx = 0;
            await outPhong(page, `Dí rồi chạy thôi ❌ THUA hết thép -${amount}K`, "#fb2424ff");
            return;
        }

        // ── 8. Thua: lên thép kế, out phòng (giữ thép cho phòng sau) ───────
        thepIdx++;
        showThongBao(page, `Thua -${amount}K -> Thép ${thepIdx + 1}: ${SoTienThep[thepIdx]}K, chờ tín hiệu`, 5000, "#fb2424ff");
        continue;
    }

    // Nếu thoát vòng lặp do isRunButon = false
    if (isDung()) {
        await outPhong(page, "Đã bấm Dừng - Thoát phòng");
    }
}

// ─── Khôi phục thép từ dữ liệu API (nếu server có lưu field thep) ───
async function restoreBotState(taiKhoan) {
    try {
        const { getToolStats } = require("./mongoDB");
        const tool = await getToolStats(taiKhoan, TEN_BOT);
        if (tool && typeof tool.thep === "number" && tool.thep >= 0 && tool.thep < SoTienThep.length) {
            thepIdx = tool.thep;
        }
    } catch (e) {
        console.error(`[BotRestore] Lỗi khi khôi phục ${TEN_BOT}:`, e.message);
    }
}

module.exports = { xulyVoPhong_Util, restoreBotState };