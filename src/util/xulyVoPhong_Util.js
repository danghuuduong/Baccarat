"use strict";
const { showThongBao, cancelThongBao } = require("../UI/UI_ThongBao");
const setting = require("../State/setting");
const { TimAnhDuaTrenListPop_Util } = require("./TimAnhDuaTrenListPop_Util");
const { DocKetQuaVang } = require("./DocKetQuaVang");
const { typeRoom, TaoDoChip_Room, ToaDoTab, TOA_DO_THOAT_PHONG, TRAO_BAI_IMG } = require("../config/RoomConfig");
const { LayTinHieu } = require("./Laytinhieu_Util");
const { showLuoiBi, hideLuoiBi, showStats } = require("../UI/UI_InGame");
const { randomSleep, sleep } = require("./Sleep_Util");
const { DocKetQuaXanh } = require("./DocKetQuaXanh");
const { syncKetQua } = require("./syncStats");

const round2 = (n) => Math.round(n * 100) / 100;

// ═══════════════════════════════════════════════════════════════════════════
//  CÁC BOT
//    quyet(dsQuyetTruoc)                        -> { amount, isThat, ben }  ("red" | "blue" | null nếu ảo)
//    ketQua(mau, isThat, ben, delta, amount)    -> cập nhật trạng thái sau khi có kết quả
//      mau = màu kết quả ván: "red" (Banker) | "blue" (Player)
// ═══════════════════════════════════════════════════════════════════════════

// Tên bot (đổi ở đây nếu server sync cần tên khác)
const TEN_BOT1 = "01-TíSố";
const TEN_BOT2 = "02-TíSố2K";
const TEN_BOT3 = "03-TíSố8";
const TEN_BOT4 = "04-TíSố13";
const TEN_BOT5 = "05-TíSố18";

// Thống kê lãi/lỗ THẬT riêng từng bot (để tính tut = đỉnh - hiện tại)
const thongKeThat = {};

function ghiThat(ten, delta) {
    if (!thongKeThat[ten]) thongKeThat[ten] = { profit: 0, dinh: 0 };
    const t = thongKeThat[ten];
    t.profit = round2(t.profit + delta);
    if (t.profit > t.dinh) t.dinh = t.profit;
    return round2(t.dinh - t.profit);
}

const LO_CHUYEN = 100;    // lỗ ròng chu kỳ chạm 100K thì sang 40K
const DU_TARGET = 10;     // ròng chu kỳ >= +10K thì đạt target
const DICH_KHUNG = 2;     // đạt target thì khung dịch 2

// ─── Bot tỉ số (dùng cho bot 1, 3, 4 — khác khung + mức cược) ─────────────
//  cuocNho: cược giai đoạn nhỏ (tỉ số ±1) | cuocLon: cược giai đoạn lớn (tỉ số ±2)
function taoBotTiSo(ten, nhan, khungB0, khungA0, cuocNho, cuocLon) {
    let tiSo = 0;
    let khungA = khungA0;
    let khungB = khungB0;
    let giaiDoan = cuocNho;    // cuocNho hoặc cuocLon
    let cycleProfit = 0;       // lãi/lỗ ròng các lệnh thật của chu kỳ
    let benKhoa = null;        // bên bị khoá khi ở 40K
    let demTarget = 0;         // số lần đạt target (cho bot 2K biết mà reset)

    return {
        ten,
        nhan,
        // Getter để đọc trạng thái nội tại từ bên ngoài (dùng để sync lên API và khôi phục)
        get demTarget() { return demTarget; },
        get tiSo() { return tiSo; },
        get khungA() { return khungA; },
        get khungB() { return khungB; },
        // Setter để khôi phục trạng thái từ API (khi bấm Reload hoặc khởi động lại)
        restore(state) {
            if (state == null) return;
            if (state.tiSo !== undefined) tiSo = state.tiSo;
            if (state.khungA !== undefined) khungA = state.khungA;
            if (state.khungB !== undefined) khungB = state.khungB;
        },
        quyet() {
            if (giaiDoan === cuocLon) return { amount: cuocLon, isThat: true, ben: benKhoa };
            if (tiSo >= khungA) return { amount: cuocNho, isThat: true, ben: "blue" };
            if (tiSo <= khungB) return { amount: cuocNho, isThat: true, ben: "red" };
            return { amount: cuocNho, isThat: false, ben: null };
        },
        ketQua(mau, isThat, ben, delta) {
            // Tỉ số: xanh ra trừ, đỏ ra cộng (cả ảo lẫn thật), cược nhỏ ±1, cược lớn ±2
            const buoc = giaiDoan === cuocLon ? 2 : 1;
            tiSo += mau === "blue" ? -buoc : buoc;

            if (!isThat) return;

            cycleProfit = round2(cycleProfit + delta);

            if (cycleProfit >= DU_TARGET) {
                // Đạt target: bên xanh (A) khung +2, bên đỏ (B) khung -2. Không đụng tỉ số.
                const d = ben === "blue" ? DICH_KHUNG : -DICH_KHUNG;
                khungA += d;
                khungB += d;
                giaiDoan = cuocNho;
                cycleProfit = 0;
                benKhoa = null;
                demTarget++;
            } else if (giaiDoan === cuocNho && cycleProfit <= -LO_CHUYEN) {
                giaiDoan = cuocLon;
                benKhoa = ben;
            }
        },
    };
}

// ─── Bot 2K: chạy song song bot gốc, cùng bên, cược 2K × n (trần 70K) ──────
const BOT2_CUOC_GOC = 2;
const BOT2_TRAN = 70;

function taoBot2K(botGoc, ten, nhan) {
    let n = 1;
    let demTargetDaThay = botGoc.demTarget;

    return {
        ten,
        nhan,
        // Getter để đọc bộ đếm n từ bên ngoài (dùng để sync và khôi phục)
        get n() { return n; },
        // Setter để khôi phục bộ đếm n từ API (khi bấm Reload hoặc khởi động lại)
        restore(state) {
            if (state == null) return;
            if (state.n !== undefined) n = Math.max(1, Number(state.n) || 1);
        },
        quyet(dsQuyetTruoc) {
            // Bot gốc vừa đạt target -> reset
            if (botGoc.demTarget !== demTargetDaThay) {
                demTargetDaThay = botGoc.demTarget;
                n = 1;
            }
            const q1 = dsQuyetTruoc.find((q) => q.bot === botGoc);
            // Bot gốc không đánh thật -> bot 2K dừng, reset
            if (!q1 || !q1.isThat) {
                n = 1;
                return { amount: BOT2_CUOC_GOC, isThat: false, ben: null };
            }
            return { amount: Math.min(BOT2_CUOC_GOC * n, BOT2_TRAN), isThat: true, ben: q1.ben };
        },
        ketQua(mau, isThat, ben) {
            if (!isThat) return;
            const thang = mau === ben;
            n = thang ? Math.max(1, n - 1) : n + 1;
        },
    };
}

// taoBotTiSo(ten, nhan, khungB, khungA, cuocNho, cuocLon)
const bot1 = taoBotTiSo(TEN_BOT1, "TS4", -4, 4, 20, 40);
const bot2 = taoBot2K(bot1, TEN_BOT2, "2K");
const bot3 = taoBotTiSo(TEN_BOT3, "TS8", -8, 8, 10, 20);
const bot4 = taoBotTiSo(TEN_BOT4, "TS13", -13, 13, 10, 20);
const bot5 = taoBotTiSo(TEN_BOT5, "TS18", -18, 18, 10, 20);

// bot2 phải đứng sau bot1
const DANH_SACH_BOT = [bot1, bot2, bot3, bot4, bot5];

// ═══════════════════════════════════════════════════════════════════════════

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

    const tenBenViet = (b) => (b === "red" ? "Đỏ" : "Xanh");

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

        // ── 2. Bot tự quyết: mức cược, ảo hay thật, bên nào ────────────────
        const quyetDinh = [];
        for (const bot of DANH_SACH_BOT) {
            quyetDinh.push({ bot, ...bot.quyet(quyetDinh) });
        }
        const botThat = quyetDinh.filter((q) => q.isThat);
        const tongCuoc = botThat.reduce((s, q) => s + q.amount, 0);
        const tongRed = botThat.filter((q) => q.ben === "red").reduce((s, q) => s + q.amount, 0);
        const tongBlue = botThat.filter((q) => q.ben === "blue").reduce((s, q) => s + q.amount, 0);
        const coThat = tongCuoc > 0;
        const tomTat = quyetDinh
            .map((q) => `${q.bot.nhan}:${q.isThat ? q.amount + "K " + tenBenViet(q.ben) : "ảo"}`)
            .join(" | ");

        const mauTB = tongRed > 0 && tongBlue === 0 ? "#e42727ff"
            : tongBlue > 0 && tongRed === 0 ? "#247afbff"
                : "#d7f706ff";

        if (coThat) {
            // ── 3. THẬT: đặt từng bên ──────────────────────────────────────
            await randomSleep(50, 100);
            if (isDung()) { await outPhong(page, "Đã bấm Dừng - Hủy cược"); return; }

            // (BBB) TẠM THỜI TẮT bên ĐỎ (B): không click chip đỏ vì bên đó mất phí. Khi nào cần đánh đỏ thật thì mở dòng dưới ra.
            // if (tongRed > 0) await datTien(tongRed, coords.datCuoc_Red);

            if (isDung()) { await outPhong(page, "Đã bấm Dừng - Hủy cược"); return; }
            if (tongBlue > 0) await datTien(tongBlue, coords.datCuoc_Blue);

            // ── 4. Xác nhận ─────────────────────────────────────────────────
            if (isDung()) { await outPhong(page, "Đã bấm Dừng - Hủy xác nhận cược"); return; }
            // Chỉ bấm xác nhận khi có đặt chip bên xanh (nếu chỉ có đỏ thì không đặt gì, khỏi xác nhận)
            if (tongBlue > 0) {
                await randomSleep(200, 300);
                await click(coords.buttonXacNhan);
            }

            // ── 5. Lưu trạng thái ──────────────────────────────────────────
            setting.set({
                isDatCuocXong: true,
                sotienuocHienTai: tongCuoc,
                bendat: tongBlue >= tongRed ? "blue" : "red",
                soVonBanDau: round2(setting.get("soVonBanDau") - tongCuoc),
            });
            capNhatStats();

            showThongBao(page, `Đặt ${tongCuoc}K
        ${tomTat}`,
                999999, mauTB);
        } else {
            // ── Ảo: không đặt tiền, không xác nhận, không trừ vốn ──────────
            showThongBao(page, `[ẢO] Chờ khung
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
            // Lệnh thật: coi như thua, trừ đủ khoản cược, sync
            for (const q of botThat) {
                setting.set("solenhthua", setting.get("solenhthua") + 1);
                if (q.ben === "red") setting.set("solenhthua_Red", setting.get("solenhthua_Red") + 1);
                else setting.set("solenhthua_Xanh", setting.get("solenhthua_Xanh") + 1);
                setting.set("profit", round2(setting.get("profit") - q.amount));
                const tut = ghiThat(q.bot.ten, -q.amount);

                // Chỉ gọi API thống kê bên XANH (A). Bên ĐỎ (B) vẫn tính bình thường ở trên nhưng không gọi API.
                if (q.ben === "blue") {
                    syncKetQua("thua", -q.amount, q.bot.ten, { khoiLuong: q.amount, phi: 0, tut, ...layTrangThaiBotExtra(q.bot) });
                }
                // (BBB)TẠM THỜI TẮT sync bên ĐỎ (B). Khi nào cần thống kê đỏ lên API thì mở dòng dưới ra (và bỏ if blue ở trên).
                // syncKetQua("thua", -q.amount, q.bot.ten, { khoiLuong: q.amount, phi: 0, tut, ...layTrangThaiBotExtra(q.bot) });
            }
            capNhatStats();
            await outPhong(page, "OutPhong -> Không đọc được kết quả - coi như thua");
            return;
        }

        // ── 8. Xử lý kết quả: B / P / T ────────────────────────────────────
        if (coThat) setting.set({ bendat: null, sotienuocHienTai: 0 });

        arraySuDungChinhList.push(ketQua);
        showLuoiBi(page, arraySuDungChinhList);

        // Hòa: không tính, không đổi trạng thái bot, thật thì hoàn tiền
        if (ketQua === "T") {
            if (coThat) {
                setting.set("soVonBanDau", round2(setting.get("soVonBanDau") + tongCuoc));
                capNhatStats();
            }

            if (isDung()) {
                await outPhong(page, "Đã bấm Dừng - Thoát phòng sau ván Hòa");
                return;
            }
            await outPhong(page, "Hoà cút");
            return;
        }

        const ketQuaMau = ketQua === "B" ? "red" : "blue";
        showThongBao(page, `${ketQua === "B" ? "Kết Quả -> ĐỎ" : "Kết Quả -> XANH "}`, 8000, ketQua === "B" ? "#fb2424ff" : "#018cffff");

        let tongDelta = 0;
        let tongVonVe = 0;
        for (const q of quyetDinh) {
            // Thắng/thua theo bên của riêng từng bot
            const thang = q.isThat && ketQuaMau === q.ben;
            // Đỏ thắng chịu phí 5%, xanh ăn đủ
            const phi = thang && q.ben === "red" ? round2(q.amount * 0.05) : 0;
            const delta = !q.isThat ? 0 : (thang ? round2(q.amount - phi) : -q.amount);

            // Tỉ số tính theo màu kết quả (ảo cũng tính)
            q.bot.ketQua(ketQuaMau, q.isThat, q.ben, delta, q.amount);

            if (!q.isThat) continue;

            // ── Thống kê + sync cho lệnh THẬT ──────────────────────────────
            tongDelta = round2(tongDelta + delta);
            if (thang) tongVonVe = round2(tongVonVe + q.amount + delta);

            if (thang) {
                setting.set("solenhwin", setting.get("solenhwin") + 1);
                if (q.ben === "red") setting.set("solenhwin_Red", setting.get("solenhwin_Red") + 1);
                else setting.set("solenhWin_Xanh", setting.get("solenhWin_Xanh") + 1);
            } else {
                setting.set("solenhthua", setting.get("solenhthua") + 1);
                if (q.ben === "red") setting.set("solenhthua_Red", setting.get("solenhthua_Red") + 1);
                else setting.set("solenhthua_Xanh", setting.get("solenhthua_Xanh") + 1);
            }

            const tut = ghiThat(q.bot.ten, delta);

            // Chỉ gọi API thống kê bên XANH (A). Bên ĐỎ (B) vẫn tính bình thường ở trên nhưng không gọi API.
            if (q.ben === "blue") {
                syncKetQua(thang ? "win" : "thua", delta, q.bot.ten, { khoiLuong: q.amount, phi, tut, ...layTrangThaiBotExtra(q.bot) });
            }
            // (BBB) THỜI TẮT sync bên ĐỎ (B). Khi nào cần thống kê đỏ lên API thì mở dòng dưới ra (và bỏ if blue ở trên).
            // syncKetQua(thang ? "win" : "thua", delta, q.bot.ten, { khoiLuong: q.amount, phi, tut, ...layTrangThaiBotExtra(q.bot) });
        }

        // Vốn chung + profit chung
        if (coThat) {
            setting.set("soVonBanDau", round2(setting.get("soVonBanDau") + tongVonVe));
            setting.set("profit", round2(setting.get("profit") + tongDelta));
            capNhatStats();
        }

        // ── Out phòng sau mỗi ván ──────────────────────────────────────────
        if (!coThat) {
            await outPhong(
                page,
                `Ảo | ${ketQua === "B" ? "ĐỎ" : "XANH"} | ${tomTat}`,
                "#d7f706ff"
            );
            return;
        }

        if (tongDelta > 0) {
            await outPhong(page, `✅ Chuồn thôi- Ăn +${tongDelta}K | ${tomTat}`, "#00fd59ff");
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

// ─── Lấy trạng thái nội tại của bot để gửi kèm lên API (tiSo, khungB, khungA hoặc n) ──
// Bot TíSố (1,3,4,5): gửi tiSo + khungB + khungA
// Bot 2K (bot2): chỉ gửi n (bộ đếm nhân)
function layTrangThaiBotExtra(bot) {
    const currentTrangThai = setting.get("botTrangThai") || {};
    let extra;
    if (typeof bot.n === "number") {
        // Bot 2K — chỉ có bộ đếm n
        extra = { botN: bot.n };
        currentTrangThai[bot.ten] = { n: bot.n };
    } else {
        // Bot TíSố — tỉ số + khung
        extra = {
            tiSo: bot.tiSo,
            khungB: bot.khungB,
            khungA: bot.khungA,
        };
        currentTrangThai[bot.ten] = { tiSo: bot.tiSo, khungB: bot.khungB, khungA: bot.khungA };
    }
    setting.set("botTrangThai", { ...currentTrangThai });
    return extra;
}

// ─── Khôi phục trạng thái các bot từ dữ liệu API (gọi khi Reload hoặc login xong) ───
// Mỗi tool trong mảng tools cần có các field tương ứng: tiSo, khungB, khungA, botN
async function restoreBotState(taiKhoan) {
    const { getToolStats } = require("./mongoDB");
    const currentTrangThai = setting.get("botTrangThai") || {};
    for (const bot of DANH_SACH_BOT) {
        try {
            const tool = await getToolStats(taiKhoan, bot.ten);
            if (tool) {
                bot.restore(tool); // bot.restore đọc tiSo/khungB/khungA hoặc n từ object
                if (typeof bot.n === "number") {
                    currentTrangThai[bot.ten] = { n: bot.n };
                } else {
                    currentTrangThai[bot.ten] = { tiSo: bot.tiSo, khungB: bot.khungB, khungA: bot.khungA };
                }
                console.log(`[BotRestore] ${bot.ten} <- tiSo=${tool.tiSo ?? "-"} khung=[${tool.khungB ?? "-"},${tool.khungA ?? "-"}] n=${tool.botN ?? "-"}`);
            }
        } catch (e) {
            console.error(`[BotRestore] Lỗi khi khôi phục ${bot.ten}:`, e.message);
        }
    }
    setting.set("botTrangThai", { ...currentTrangThai });
}

module.exports = { xulyVoPhong_Util, restoreBotState };