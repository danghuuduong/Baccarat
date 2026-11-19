"use strict";
const { showThongBao, cancelThongBao } = require("../UI/UI_ThongBao");
const setting = require("../State/setting");
const { TimAnhDuaTrenListPop_Util } = require("./TimAnhDuaTrenListPop_Util");
const { DocKetQuaVang } = require("./DocKetQuaVang");
const { typeRoom, TaoDoChip_Room, ToaDoTab, TOA_DO_THOAT_PHONG, SoTienThep, TRAO_BAI_IMG } = require("../config/RoomConfig");
const { LayTinHieu } = require("./Laytinhieu_Util");
const { showLuoiBi, hideLuoiBi, showStats } = require("../UI/UI_InGame");
const { randomSleep, sleep } = require("./Sleep_Util");
const { DocKetQuaXanh } = require("./DocKetQuaXanh");
const { syncKetQua } = require("./syncStats");

// Bên đánh khi LayTinHieu trả true: "red" hoặc "blue" (đổi ở đây)
const BEN_DANH = "blue";

const round2 = (n) => Math.round(n * 100) / 100;

// ═══════════════════════════════════════════════════════════════════════════
//  4 BOT CHIẾN THUẬT - mỗi bot có trạng thái + hàm riêng
//  Mỗi bot có 2 hàm:
//    quyet()                                  -> { amount, isThat, ... } quyết định cho ván này
//    ketQua(thang, isThat, delta, amount)     -> cập nhật trạng thái riêng sau khi có kết quả
// ═══════════════════════════════════════════════════════════════════════════

// ── Thống kê lãi/lỗ THẬT riêng từng bot (để tính tut = đỉnh - hiện tại) ─────
const TEN_BOT1 = "01-Thếp5";
const TEN_BOT2 = "02-Thếp3";
const TEN_BOT3 = "03-ChờLỗ180k";
const TEN_BOT4 = "04-TíSố";

const thongKeThat = {
    [TEN_BOT1]: { profit: 0, dinh: 0 },
    [TEN_BOT2]: { profit: 0, dinh: 0 },
    [TEN_BOT3]: { profit: 0, dinh: 0 },
    [TEN_BOT4]: { profit: 0, dinh: 0 },
};

// Cộng lãi/lỗ thật cho bot, trả về tut (đỉnh - lợi nhuận hiện tại)
function ghiThat(ten, delta) {
    const t = thongKeThat[ten];
    t.profit = round2(t.profit + delta);
    if (t.profit > t.dinh) t.dinh = t.profit;
    return round2(t.dinh - t.profit);
}

// ── BOT 1: 01-Thep5 ─────────────────────────────────────────────────────────
const THEP_MAX = SoTienThep.length;
let thepLocal1 = 1;   // thép hiện tại
let countAO1 = 0;     // số ván ảo thua liên tiếp

const bot1 = {
    ten: TEN_BOT1,
    nhan: "T5",
    quyet() {
        const soChuoiDat = setting.get("soChuoiDat");
        return {
            amount: SoTienThep[thepLocal1 - 1],
            isThat: !(soChuoiDat > 0) || countAO1 >= soChuoiDat,
            thep: thepLocal1,
        };
    },
    ketQua(thang, isThat) {
        if (isThat) {
            if (thang) { thepLocal1 = 1; countAO1 = 0; }
            else thepLocal1 = thepLocal1 >= THEP_MAX ? 1 : thepLocal1 + 1;
        } else {
            if (thang) countAO1 = 0;
            else countAO1++;
        }
    },
};

// ── BOT 2: 02-Thep3 ─────────────────────────────────────────────────────────
const SoTienThep2 = [20, 50, 110];
const THEP_MAX2 = SoTienThep2.length;
let thepLocal2 = 1;

const bot2 = {
    ten: TEN_BOT2,
    nhan: "T3",
    quyet() {
        return { amount: SoTienThep2[thepLocal2 - 1], isThat: true, thep: thepLocal2 };
    },
    ketQua(thang) {
        if (thang) thepLocal2 = 1;
        else thepLocal2 = thepLocal2 >= THEP_MAX2 ? 1 : thepLocal2 + 1;
    },
};

// ── BOT 3: 03-GiaLo180 ──────────────────────────────────────────────────────
const BOT3_CUOC = 20;
const BOT3_NGUONG_TUT = 180;   // ảo tụt 180K so với đỉnh gần nhất thì đánh thật
const BOT3_TARGET = 100;       // lãi thật đạt 100K thì kết thúc chu kỳ

let profitAo3 = 0;       // lợi nhuận mô phỏng tích lũy
let dinhProfitAo3 = 0;   // đỉnh lợi nhuận gần nhất
let profitThat3 = 0;     // lợi nhuận thật của chu kỳ hiện tại
let dangThat3 = false;   // đang trong chu kỳ đánh thật

const bot3 = {
    ten: TEN_BOT3,
    nhan: "GL",
    quyet() {
        return { amount: BOT3_CUOC, isThat: dangThat3 };
    },
    ketQua(thang, isThat, delta) {
        // Ảo luôn cộng/trừ theo mức 20K (kể cả lúc đang đánh thật)
        profitAo3 += thang ? BOT3_CUOC : -BOT3_CUOC;
        if (profitAo3 > dinhProfitAo3) dinhProfitAo3 = profitAo3;

        if (isThat) {
            profitThat3 = round2(profitThat3 + delta);
            if (profitThat3 >= BOT3_TARGET) {
                // Đạt target: reset hết, về chờ âm 180 từ đỉnh
                dangThat3 = false;
                profitAo3 = 0;
                dinhProfitAo3 = 0;
                profitThat3 = 0;
            }
        } else if (dinhProfitAo3 - profitAo3 >= BOT3_NGUONG_TUT) {
            dangThat3 = true;
            profitThat3 = 0;
        }
    },
};

// ── BOT 4: 04-TiSo ──────────────────────────────────────────────────────────
const BOT4_CUOC_NHO = 20;
const BOT4_CUOC_LON = 40;
const BOT4_TI_SO_VAO = 4;      // tỉ số >= 4 thì vào thật
const BOT4_LO_CHUYEN = 100;    // lỗ ròng chu kỳ chạm 100K thì sang 40K
const BOT4_DU_TARGET = 10;     // ròng chu kỳ >= +10K thì đạt target

let tiSo4 = 0;
let giaiDoan4 = 20;       // 20 hoặc 40
let cycleProfit4 = 0;     // lãi/lỗ ròng các lệnh thật của chu kỳ

const bot4 = {
    ten: TEN_BOT4,
    nhan: "TS",
    quyet() {
        if (giaiDoan4 === BOT4_CUOC_LON) return { amount: BOT4_CUOC_LON, isThat: true };
        return { amount: BOT4_CUOC_NHO, isThat: tiSo4 >= BOT4_TI_SO_VAO };
    },
    ketQua(thang, isThat, delta) {
        const giaiDoanLucCuoc = giaiDoan4;
        const buoc = giaiDoanLucCuoc === BOT4_CUOC_LON ? 2 : 1;

        // Tỉ số: thắng trừ, thua cộng (không xuống dưới 0)
        tiSo4 = Math.max(0, tiSo4 + (thang ? -buoc : buoc));

        if (isThat) {
            cycleProfit4 = round2(cycleProfit4 + delta);

            if (giaiDoanLucCuoc === BOT4_CUOC_LON) {
                if (cycleProfit4 >= BOT4_DU_TARGET) {
                    // Đạt target: trừ thêm 2 điểm (tổng thắng giảm 4), reset về 20K
                    tiSo4 = Math.max(0, tiSo4 - 2);
                    giaiDoan4 = BOT4_CUOC_NHO;
                    cycleProfit4 = 0;
                }
            } else if (cycleProfit4 <= -BOT4_LO_CHUYEN) {
                giaiDoan4 = BOT4_CUOC_LON;
            }
        }

        // Về lại chờ (giai đoạn 20K, tỉ số < 4) thì chu kỳ coi như kết thúc
        if (giaiDoan4 === BOT4_CUOC_NHO && tiSo4 < BOT4_TI_SO_VAO) cycleProfit4 = 0;
    },
};

const DANH_SACH_BOT = [bot1, bot2, bot3, bot4];

// ═══════════════════════════════════════════════════════════════════════════

// Cộng thống kê thép (chỉ bot 1): loai = "win" | "thua"
function tangThongKeThep(thep, loai) {
    const tk = setting.get("thongkesolieuthep") || {};
    if (!tk[thep]) tk[thep] = { win: 0, thua: 0 };
    tk[thep][loai]++;
    setting.set("thongkesolieuthep", { ...tk });
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
    showThongBao(page, `${lyDo}`, 8000, cl);
    await randomSleep(2500, 3500);
    const tab1 = ToaDoTab.find(t => t.tab === 1);
    await page.mouse.click(TOA_DO_THOAT_PHONG.x, TOA_DO_THOAT_PHONG.y);
    await randomSleep(70, 150);
    if (tab1) await page.mouse.click(Math.round(tab1.x), Math.round(tab1.y));
    setting.set("tabHienTai", 1);
    await randomSleep(200, 333);


    const isTypeHotUI = await TimAnhDuaTrenListPop_Util(page, ["HotUi"], 1200);
    if (isTypeHotUI) {
        await page.mouse.click(51, 370);
        await randomSleep(300, 500);
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

    // Chọn phòng: random trong danh sách
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
                // await click(coords[ten]);
                await randomSleep(222, 333);
                if (isDung()) return;
                // await click(coordBen);
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
        const vanMoi = await choVanMoi(5 * 60000);
        if (isDung()) { await outPhong(page, "Đã bấm Dừng khi chờ ván mới"); return; }
        if (!vanMoi) { await outPhong(page, "OutPhong -> Không tìm Bắt đầu ván mới - Hoặc Tráo Bài"); return; }

        const tinHieu = LayTinHieu([...arraySuDungChinhList]);

        // Không có tín hiệu: ngồi chờ, đọc kết quả ván kế rồi lấy tín hiệu lại
        if (!tinHieu) {
            showThongBao(page, "Chờ tín hiệu...", 5000, "#d7f706ff");
            const kqCho = await choKetQuaVang(2 * 60000);
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

        // ── 2. Mỗi bot tự quyết: mức cược, ảo hay thật ─────────────────────
        const quyetDinh = DANH_SACH_BOT.map((bot) => ({ bot, ...bot.quyet() }));
        const botThat = quyetDinh.filter((q) => q.isThat);
        const tongCuoc = botThat.reduce((s, q) => s + q.amount, 0);
        const coThat = tongCuoc > 0;
        const tomTat = quyetDinh
            .map((q) => `${q.bot.nhan}:${q.isThat ? q.amount + "K" : "ảo"}`)
            .join(" | ");

        // Có tín hiệu thì đánh bên BEN_DANH
        const benDanh = BEN_DANH;
        const tenBen = benDanh === "red" ? "Đỏ" : "Xanh";
        const coordBen = benDanh === "red" ? coords.datCuoc_Red : coords.datCuoc_Blue;
        const mauTB = tenBen === "Xanh" ? "#247afbff" : "#e42727ff";

        if (coThat) {
            // ── 3. THẬT: gộp tổng cược các bot đang đánh thật ──────────────
            await randomSleep(50, 100);
            if (isDung()) { await outPhong(page, "Đã bấm Dừng - Hủy cược"); return; }
            await datTien(tongCuoc, coordBen);

            // ── 4. Xác nhận ─────────────────────────────────────────────────
            if (isDung()) { await outPhong(page, "Đã bấm Dừng - Hủy xác nhận cược"); return; }
            await randomSleep(200, 300);
            await click(coords.buttonXacNhan);

            // ── 5. Lưu trạng thái ──────────────────────────────────────────
            setting.set({
                isDatCuocXong: true,
                sotienuocHienTai: tongCuoc,
                bendat: benDanh,
                soVonBanDau: round2(setting.get("soVonBanDau") - tongCuoc),
            });
            capNhatStats();

            showThongBao(page, `Đặt ${tenBen} ${tongCuoc}K
        ${tomTat}`,
                999999, mauTB);
        } else {
            // ── Toàn bộ ẢO: không đặt tiền, không xác nhận, không trừ vốn ──
            showThongBao(page, `[ẢO] Giả đặt ${tenBen}
        ${tomTat}`,
                999999, mauTB);
        }

        // ── 6. Chờ rồi tìm kết quả bằng LED vàng ───────────────────────────
        await sleepKiemTra(10000);
        const ketQua = await choKetQuaVang(4 * 60000);

        cancelThongBao(page);
        setting.set("isDatCuocXong", false);

        // ── 7. Không ra kết quả ────────────────────────────────────────────
        if (!ketQua) {
            if (isDung()) {
                await outPhong(page, "Đã bấm Dừng - Thoát phòng");
                return;
            }

            // Toàn ảo: không tính gì, chỉ out
            if (!coThat) {
                await outPhong(page, "OutPhong -> Không đọc được kết quả (ván ảo)");
                return;
            }

            showThongBao(page, "Lỗi khi check kết quả", 5000, "#fb2424ff");
            // Mỗi bot đang đánh thật: coi như thua, trừ đủ khoản cược, sync riêng
            for (const q of botThat) {
                setting.set("solenhthua", setting.get("solenhthua") + 1);
                if (benDanh === "red") setting.set("solenhthua_Red", setting.get("solenhthua_Red") + 1);
                else setting.set("solenhthua_Xanh", setting.get("solenhthua_Xanh") + 1);
                if (q.bot === bot1) tangThongKeThep(q.thep, "thua");
                setting.set("profit", round2(setting.get("profit") - q.amount));
                const tut = ghiThat(q.bot.ten, -q.amount);
                syncKetQua("thua", -q.amount, q.bot.ten, { khoiLuong: q.amount, phi: 0, tut });
            }
            capNhatStats();
            await outPhong(page, "OutPhong -> Không đọc được kết quả - coi như thua");
            return;
        }

        // ── 8. Xử lý kết quả: B / P / T ────────────────────────────────────
        if (coThat) setting.set({ bendat: null, sotienuocHienTai: 0 });

        arraySuDungChinhList.push(ketQua);
        showLuoiBi(page, arraySuDungChinhList);

        // Hòa: không tính, không đổi trạng thái bot nào, ở lại đánh tiếp (thật thì hoàn tiền)
        if (ketQua === "T") {
            if (coThat) {
                setting.set("soVonBanDau", round2(setting.get("soVonBanDau") + tongCuoc));
                capNhatStats();
            }
            showThongBao(page, `🤝 HÒA | Vốn: ${setting.get("soVonBanDau")}K`, 8000, "#36ca0dff");

            if (isDung()) {
                await outPhong(page, "Đã bấm Dừng - Thoát phòng sau ván Hòa");
                return;
            }

            const found = await choVanMoi(5 * 60000);
            if (isDung()) { await outPhong(page, "Đã bấm Dừng khi chờ ván mới"); return; }
            if (!found) { await outPhong(page, "Dính Hoà rồi - chạy"); return; }
            continue;
        }

        const ketQuaMau = ketQua === "B" ? "red" : "blue";
        showThongBao(page, `${ketQua === "B" ? "Kết Quả -> ĐỎ" : "Kết Quả -> XANH "}`, 8000, ketQua === "B" ? "#fb2424ff" : "#018cffff");

        const thang = ketQuaMau === benDanh;

        // Cả 4 bot cùng nhận 1 kết quả, mỗi bot cập nhật trạng thái riêng đúng 1 lần
        let tongDelta = 0;
        let tongVonVe = 0;
        for (const q of quyetDinh) {
            // Đỏ thắng chịu phí 5%, xanh ăn đủ
            const phi = thang && benDanh === "red" ? round2(q.amount * 0.05) : 0;
            const delta = thang ? round2(q.amount - phi) : -q.amount;

            q.bot.ketQua(thang, q.isThat, delta, q.amount);

            if (!q.isThat) continue;

            // ── Thống kê + sync cho lệnh THẬT của bot này ──────────────────
            tongDelta = round2(tongDelta + delta);
            if (thang) tongVonVe = round2(tongVonVe + q.amount + delta);

            if (thang) {
                setting.set("solenhwin", setting.get("solenhwin") + 1);
                if (benDanh === "red") setting.set("solenhwin_Red", setting.get("solenhwin_Red") + 1);
                else setting.set("solenhWin_Xanh", setting.get("solenhWin_Xanh") + 1);
            } else {
                setting.set("solenhthua", setting.get("solenhthua") + 1);
                if (benDanh === "red") setting.set("solenhthua_Red", setting.get("solenhthua_Red") + 1);
                else setting.set("solenhthua_Xanh", setting.get("solenhthua_Xanh") + 1);
            }
            if (q.bot === bot1) tangThongKeThep(q.thep, thang ? "win" : "thua");

            const tut = ghiThat(q.bot.ten, delta);
            syncKetQua(thang ? "win" : "thua", delta, q.bot.ten, { khoiLuong: q.amount, phi, tut });
        }

        // Vốn chung + profit chung: cộng 1 lần theo tổng các bot đánh thật
        if (coThat) {
            setting.set("soVonBanDau", round2(setting.get("soVonBanDau") + tongVonVe));
            setting.set("profit", round2(setting.get("profit") + tongDelta));
            capNhatStats();
        }

        // ── Out phòng sau mỗi ván ──────────────────────────────────────────
        if (!coThat) {
            await outPhong(
                page,
                thang ? `Ảo THẮNG | ${tomTat}` : `Ảo THUA | ${tomTat}`,
                thang ? "#00fd59ff" : "#fb2424ff"
            );
            return;
        }

        if (thang) {
            await outPhong(page, `✅ Chuồn thôi- Ăn ${tongDelta >= 0 ? "+" : ""}${tongDelta}K | ${tomTat}`, "#00fd59ff");
        } else {
            await outPhong(page, `Dí rồi chạy thôi ❌ THUA ${tongDelta}K | ${tomTat}`, "#fb2424ff");
        }
        return;
    }

    // Nếu thoát vòng lặp do isRunButon = false
    if (isDung()) {
        await outPhong(page, "Đã bấm Dừng - Thoát phòng");
    }
}

module.exports = { xulyVoPhong_Util };