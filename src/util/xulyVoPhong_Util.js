"use strict";
const { showThongBao, cancelThongBao } = require("../UI/UI_ThongBao");
const setting = require("../State/setting");
const { TimAnhDuaTrenListPop_Util } = require("./TimAnhDuaTrenListPop_Util");
const { DocKetQuaVang } = require("./DocKetQuaVang");
const { typeRoom, /* typeKetQua, */ TaoDoChip_Room, ToaDoTab, TOA_DO_THOAT_PHONG } = require("../config/RoomConfig");
const { LayTinHieu } = require("./Laytinhieu_Util");
const { showLuoiBi, hideLuoiBi, showStats } = require("../UI/UI_InGame");
const { randomSleep, sleep } = require("./Sleep_Util");
const { DocKetQuaXanh } = require("./DocKetQuaXanh");
const { syncKetQua } = require("./syncStats");

// Chỉ giữ để tính MOC = 180
const SO_TIEN_UOC_LIST = [20, 50, 110];
const MOC = SO_TIEN_UOC_LIST.reduce((a, b) => a + b, 0); // 180
const soTienLaiChuKiDCA_Reset = 15
function capNhatMoc(delta) {
    if (typeof delta !== "number" || isNaN(delta)) return;

    let du = (setting.get("soDuMoc") || 0) + delta;
    let duong = setting.get("tiSoDuong") || 0;
    let am = setting.get("tiSoAm") || 0;
    let vs = setting.get("VSTISO") || 0;

    while (du >= MOC) { du -= MOC; duong++; vs++; }
    while (du <= -MOC) { du += MOC; am++; vs--; }

    setting.set({
        soDuMoc: Math.round(du * 100) / 100,
        tiSoDuong: duong,
        tiSoAm: am,
        VSTISO: vs,
    });
    if (vs > setting.get("VSTISO_Duong_Max")) setting.set("VSTISO_Duong_Max", vs);
    if (vs < setting.get("VSTISO_Am_Max")) setting.set("VSTISO_Am_Max", vs);
}

// ── Tính volDCA dựa theo bcrSauNhat (giá trị âm hoặc 0) ──────────────────────
function tinhVolDCA() {
    const sauNhat = setting.get("bcrSauNhat") || 0;
    const abs = Math.abs(Math.min(0, sauNhat));
    if (abs >= 30) return 150;
    if (abs >= 25) return 130;
    if (abs >= 20) return 100;
    if (abs >= 15) return 80;
    if (abs >= 10) return 60;
    if (abs >= 5) return 40;
    return 20;
}

// ── Tính volSW dựa theo bcr_sw (giá trị âm hoặc 0) ──────────────────────────
function tinhVolSW() {
    const bcrSW = setting.get("bcr_sw") || 0;
    const abs = Math.abs(Math.min(0, bcrSW));
    if (abs < 5) return 2 * (1 + abs);
    return Math.min(50, 10 + 3 * (abs - 4));
}

function buildStats() {
    return {
        // DCA
        soVonBanDau_DCA: setting.get("soVonBanDau_DCA"),
        SoTienLonNhatTungSoHuu_DCA: setting.get("SoTienLonNhatTungSoHuu_DCA"),
        TonThat_Max_DCA: setting.get("TonThat_Max_DCA"),
        profit_DCA: setting.get("profit_DCA"),
        solenhwin_DCA: setting.get("solenhwin_DCA"),
        solenhthua_DCA: setting.get("solenhthua_DCA"),
        bcr: setting.get("bcr"),
        bcrSauNhat: setting.get("bcrSauNhat"),
        laiChuKy: setting.get("laiChuKy"),
        // SW
        soVonBanDau_SW: setting.get("soVonBanDau_SW"),
        SoTienLonNhatTungSoHuu_SW: setting.get("SoTienLonNhatTungSoHuu_SW"),
        TonThat_Max_SW: setting.get("TonThat_Max_SW"),
        profit_SW: setting.get("profit_SW"),
        solenhwin_SW: setting.get("solenhwin_SW"),
        solenhthua_SW: setting.get("solenhthua_SW"),
        bcr_sw: setting.get("bcr_sw"),
        // Mốc tỉ số (giữ nguyên)
        soChuoiDat: setting.get("soChuoiDat"),
        TonThat_Max: setting.get("TonThat_Max"),
        tiSoDuong: setting.get("tiSoDuong"),
        tiSoAm: setting.get("tiSoAm"),
        VSTISO: setting.get("VSTISO"),
        VSTISO_Duong_Max: setting.get("VSTISO_Duong_Max"),
        VSTISO_Am_Max: setting.get("VSTISO_Am_Max"),
    };
}

// Mảng bi đang dùng để lấy tín hiệu
let arraySuDungChinhList = [];

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
        isStart: true,
    });
    showThongBao(page, `${lyDo}`, 8000, cl);
    await randomSleep(2500, 3500);
    // click tab 1 để thoát phòng
    const tab1 = ToaDoTab.find(t => t.tab === 1);
    await page.mouse.click(TOA_DO_THOAT_PHONG.x, TOA_DO_THOAT_PHONG.y);
    await randomSleep(70, 150);
    if (tab1) await page.mouse.click(Math.round(tab1.x), Math.round(tab1.y));
    await randomSleep(200, 333);

    setTimeout(() => {
        const { vongLapChupManHinh } = require("./VongLapChupManHinh");
        vongLapChupManHinh(page);
    }, 444);
}

async function xulyVoPhong_Util(page, danhSach) {

    if (!danhSach || danhSach.length === 0) return;

    // Chọn phòng có ngam lớn nhất; bằng nhau thì chọn phòng có thép lớn nhất

    const phongTotNhat = danhSach.reduce((max, phong) => {
        if (phong.ngam !== max.ngam) return phong.ngam > max.ngam ? phong : max;
        return phong.infoTinHieu.thep > max.infoTinHieu.thep ? phong : max;
    });

    // Lựa chọn ngẫu nhiên
    // let ungVien = [];
    // for (const phong of danhSach) {
    //     if (ungVien.length === 0) { ungVien = [phong]; continue; }
    //     const best = ungVien[0];
    //     if (phong.ngam > best.ngam ||
    //         (phong.ngam === best.ngam && phong.infoTinHieu.thep > best.infoTinHieu.thep)) {
    //         ungVien = [phong];          // có thằng mạnh hơn, reset
    //     } else if (phong.ngam === best.ngam &&
    //         phong.infoTinHieu.thep === best.infoTinHieu.thep) {
    //         ungVien.push(phong);        // hòa hoàn toàn, thêm vào
    //     }
    // }
    // const phongTotNhat = ungVien[Math.floor(Math.random() * ungVien.length)];

    // ── Lần 1: Click vào phòng được chọn ──────────────────────────────────
    await page.mouse.click(
        Math.round(phongTotNhat.x),
        Math.round(phongTotNhat.y)
    );

    // Check loại phòng
    let roomType = await TimAnhDuaTrenListPop_Util(page, [typeRoom.room_a, typeRoom.room_b], 3000);

    if (!roomType) {
        // ── Lần 2: Click lại + tìm thêm 2 giây ──────────────────────────────
        await page.mouse.click(
            Math.round(phongTotNhat.x),
            Math.round(phongTotNhat.y)
        );
        roomType = await TimAnhDuaTrenListPop_Util(page, [typeRoom.room_a, typeRoom.room_b], 2000);
    }

    if (!roomType) {
        await outPhong(page, "Out Phòng- Không tìm được type Phòng");
        return;
    }

    // Không so khớp lưới nữa: lấy thẳng arr của phòng đã chọn
    arraySuDungChinhList = [...(phongTotNhat.arr || [])];

    // ── Phần đặt cược ─────────────────────────────────────────────────────
    const thongBao = `Phòng: ${phongTotNhat.phong} =>  ${roomType === typeRoom.room_a ? "Sảnh Sexy" : "Sảnh Bacarat"}`;
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
    // const kq = typeKetQua[roomType];

    // Di chuột tới điểm rồi mới click (để game nhận hover)
    const click = async (coord) => {
        const x = Math.round(coord.x), y = Math.round(coord.y);
        await page.mouse.move(x, y, { steps: 3 });
        await randomSleep(100, 150);
        await page.mouse.click(x, y);
    };

    // Chip ưu tiên số to trước
    const CHIP_THU_TU = [
        ["chip100", 100],
        ["chip50", 50],
        ["chip20", 20],
        ["chip10", 10],
        ["chip5", 5],
        ["chip1", 1],
    ];

    // Mỗi chip: chọn chip -> click bên cược
    async function datTien(tien, coordBen) {
        let con = tien;
        for (const [ten, gia] of CHIP_THU_TU) {
            while (con >= gia) {
                // await click(coords[ten]);
                // await randomSleep(222, 333);
                // await click(coordBen);
                // await randomSleep(222, 333);
                con -= gia;
            }
        }
    }

    // Poll LED vàng đến khi ra B/P/T hoặc hết timeout
    async function choKetQuaVang(timeoutMs) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const r = await DocKetQuaVang(page, roomType);
            if (r) return r;
            await sleep(133);
        }
        return null;
    }

    // Chờ ván mới: thấy ảnh Status_BatDauVandau HOẶC điểm xanh lá là qua
    async function choVanMoi(timeoutMs) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (await DocKetQuaXanh(page, roomType)) {
                // console.log(`[choVanMoi] 🟢 XANH LÁ tìm thấy (sau ${Date.now() - start}ms)`);
                return true;
            }
            const anh = await TimAnhDuaTrenListPop_Util(page, ["Status_BatDauVandau"], 200);
            if (anh) {
                // console.log(`[choVanMoi] 🖼️ ẢNH tìm thấy (sau ${Date.now() - start}ms)`);
                return true;
            }
            await sleep(100);
        }
        // console.log(`[choVanMoi] ❌ Hết giờ ${timeoutMs}ms, không ai tìm thấy`);
        return false;
    }

    const capNhatStats = () => {
        // Tổn thất DCA
        const ttDCA = setting.get("SoTienLonNhatTungSoHuu_DCA") - setting.get("soVonBanDau_DCA");
        if (ttDCA > setting.get("TonThat_Max_DCA")) setting.set("TonThat_Max_DCA", ttDCA);

        // Tổn thất SW
        const ttSW = setting.get("SoTienLonNhatTungSoHuu_SW") - setting.get("soVonBanDau_SW");
        if (ttSW > setting.get("TonThat_Max_SW")) setting.set("TonThat_Max_SW", ttSW);

        showStats(page, buildStats());
    };

    while (true) {
        // ── 1. Lấy tín hiệu ────────────────────────────────────────────────
        const tinHieu = LayTinHieu([...arraySuDungChinhList]);

        if (!tinHieu) {
            await outPhong(page, "OutPhong- Không có tín hiệu");
            return;
        }

        // ── 2. Tính vol DCA và SW ───────────────────────────────────────────
        const volDCA = tinhVolDCA();
        const volSW = tinhVolSW();
        const tongCuoc = volDCA + volSW;
        const tenBen = tinHieu.tinhieu === "red" ? "Đỏ" : "Xanh";
        const coordBen = tinHieu.tinhieu === "red" ? coords.datCuoc_Red : coords.datCuoc_Blue;

        // ── 3. Chờ bảng chip ổn định rồi chọn chip + đặt bên ───────────────
        await randomSleep(111, 155);
        await datTien(tongCuoc, coordBen);

        // ── 4. Xác nhận ─────────────────────────────────────────────────────
        await randomSleep(222, 333);
        await click(coords.buttonXacNhan);

        // ── 5. Lưu trạng thái + showThongBao ────────────────────────────────
        setting.set({
            isDatCuocXong: true,
            sotienuocHienTai: tongCuoc,
            bendat: tinHieu.tinhieu,
            soVonBanDau_DCA: Math.round((setting.get("soVonBanDau_DCA") - volDCA) * 100) / 100,
            soVonBanDau_SW: Math.round((setting.get("soVonBanDau_SW") - volSW) * 100) / 100,
        });
        capNhatStats();
        showThongBao(
            page,
            `Đặt ${tenBen} | DCA ${volDCA}K + SW ${volSW}K - Thếp ${tinHieu.thep}`,
            999999,
            tenBen === "Xanh" ? "#247afbff" : "#e42727ff"
        );

        // ── 6. Chờ 15s rồi tìm kết quả bằng LED vàng (70s) ─────────────────
        await sleep(12000);
        const ketQua = await choKetQuaVang(70000);

        // (tạm comment) cách cũ: tìm ảnh kq_*
        // const anhKetQua = await TimAnhDuaTrenListPop_Util(page, [kq.red, kq.blue, kq.green], 30000);
        // let ketQua = null;
        // if (anhKetQua === kq.red) ketQua = "B";
        // else if (anhKetQua === kq.blue) ketQua = "P";
        // else if (anhKetQua === kq.green) ketQua = "T";

        cancelThongBao(page);
        setting.set("isDatCuocXong", false);

        // ── 7. Không ra kết quả → coi như thua cả hai bot, thoát phòng ──────
        if (!ketQua) {
            showThongBao(page, "Lỗi khi check kết quả", 5000, "#fb2424ff");

            // DCA thua
            const profitDCA_Thua = -volDCA;
            setting.set({
                solenhthua_DCA: setting.get("solenhthua_DCA") + 1,
                profit_DCA: Math.round((setting.get("profit_DCA") + profitDCA_Thua) * 100) / 100,
                bcr: setting.get("bcr") - 1,
                laiChuKy: Math.round((setting.get("laiChuKy") + profitDCA_Thua) * 100) / 100,
            });
            setting.set("bcrSauNhat", Math.min(setting.get("bcrSauNhat"), setting.get("bcr")));

            // SW thua
            const profitSW_Thua = -volSW;
            setting.set({
                solenhthua_SW: setting.get("solenhthua_SW") + 1,
                profit_SW: Math.round((setting.get("profit_SW") + profitSW_Thua) * 100) / 100,
                bcr_sw: setting.get("bcr_sw") - 1,
            });

            // Mốc tổng (giữ nguyên)
            capNhatMoc(profitDCA_Thua + profitSW_Thua);

            // Sync
            if (!process.env.TOOL_NAME) console.warn("[Sync] TOOL_NAME chưa set trong .env");
            if (!process.env.TOOL_NAME2) console.warn("[Sync] TOOL_NAME2 chưa set trong .env");
            syncKetQua("thua", profitDCA_Thua, process.env.TOOL_NAME);
            syncKetQua("thua", profitSW_Thua, process.env.TOOL_NAME2);

            capNhatStats();
            await outPhong(page, "OutPhong -> Không đọc được kết quả - coi như thua");
            return;
        }

        // ── 8. Xử lý kết quả: B / P / T ────────────────────────────────────
        const bendat = setting.get("bendat");
        setting.set({ bendat: null, sotienuocHienTai: 0 });

        arraySuDungChinhList.push(ketQua);
        showLuoiBi(page, arraySuDungChinhList);

        if (ketQua === "T") {
            // ── Hòa → hoàn lại tiền cho cả 2 bot, giữ bcr/bcr_sw ────────────
            setting.set({
                soVonBanDau_DCA: Math.round((setting.get("soVonBanDau_DCA") + volDCA) * 100) / 100,
                soVonBanDau_SW: Math.round((setting.get("soVonBanDau_SW") + volSW) * 100) / 100,
            });
            capNhatStats();
            showThongBao(
                page,
                `🤝 HÒA | DCA Vốn: ${setting.get("soVonBanDau_DCA")}K | SW Vốn: ${setting.get("soVonBanDau_SW")}K`,
                8000,
                "#36ca0dff"
            );

            if (tinHieu.thep === 3) {
                await outPhong(page, `🤝Lượn thôi  HÒA`, "#36ca0dff");
                return;
            }

            // Hòa thép 1, 2 → chờ ván mới rồi tiếp tục
            const found = await choVanMoi(80000);
            if (!found) { await outPhong(page, "Dính Hoà rồi - chạy"); return; }
            continue;
        }

        const ketQuaMau = ketQua === "B" ? "red" : "blue";
        showThongBao(
            page,
            `${ketQua === "B" ? "Kết Quả -> ĐỎ" : "Kết Quả -> XANH "}`,
            8000,
            ketQua === "B" ? "#fb2424ff" : "#018cffff"
        );

        if (ketQuaMau === bendat) {
            // ── Thắng ─────────────────────────────────────────────────────

            // DCA thắng
            const laiDCA = bendat === "red"
                ? Math.round(volDCA * 0.95 * 100) / 100
                : volDCA;
            setting.set({
                soVonBanDau_DCA: Math.round((setting.get("soVonBanDau_DCA") + volDCA + laiDCA) * 100) / 100,
                profit_DCA: Math.round((setting.get("profit_DCA") + laiDCA) * 100) / 100,
                solenhwin_DCA: setting.get("solenhwin_DCA") + 1,
                bcr: setting.get("bcr") + 1,
                laiChuKy: Math.round((setting.get("laiChuKy") + laiDCA) * 100) / 100,
            });
            setting.set("bcrSauNhat", Math.min(setting.get("bcrSauNhat"), setting.get("bcr")));

            // Reset chu kỳ DCA nếu laiChuKy >= 15
            if (setting.get("laiChuKy") >= soTienLaiChuKiDCA_Reset) {
                setting.set({ bcr: 0, bcrSauNhat: 0, laiChuKy: 0 });
                showThongBao(page, "🔄 Reset chu kỳ DCA", 4000, "#36ca0dff");
            }

            // Cập nhật $Max DCA
            if (setting.get("soVonBanDau_DCA") > setting.get("SoTienLonNhatTungSoHuu_DCA")) {
                setting.set("SoTienLonNhatTungSoHuu_DCA", setting.get("soVonBanDau_DCA"));
            }

            // SW thắng
            const laiSW = bendat === "red"
                ? Math.round(volSW * 0.95 * 100) / 100
                : volSW;
            setting.set({
                soVonBanDau_SW: Math.round((setting.get("soVonBanDau_SW") + volSW + laiSW) * 100) / 100,
                profit_SW: Math.round((setting.get("profit_SW") + laiSW) * 100) / 100,
                solenhwin_SW: setting.get("solenhwin_SW") + 1,
                bcr_sw: Math.min(0, setting.get("bcr_sw") + 1),
            });

            // Cập nhật $Max SW
            if (setting.get("soVonBanDau_SW") > setting.get("SoTienLonNhatTungSoHuu_SW")) {
                setting.set("SoTienLonNhatTungSoHuu_SW", setting.get("soVonBanDau_SW"));
            }

            // Mốc tổng (giữ nguyên)
            capNhatMoc(laiDCA + laiSW);

            // Sync DCA trước, SW sau
            if (!process.env.TOOL_NAME) console.warn("[Sync] TOOL_NAME chưa set trong .env");
            if (!process.env.TOOL_NAME2) console.warn("[Sync] TOOL_NAME2 chưa set trong .env");
            syncKetQua("win", laiDCA, process.env.TOOL_NAME);
            syncKetQua("win", laiSW, process.env.TOOL_NAME2);

            capNhatStats();
            await outPhong(page, `✅ Chuồn thôi - DCA +${laiDCA}K | SW +${laiSW}K`, "#00fd59ff");
            return;

        } else {
            // ── Thua ──────────────────────────────────────────────────────

            // DCA thua
            const profitDCA_Thua = -volDCA;
            setting.set({
                solenhthua_DCA: setting.get("solenhthua_DCA") + 1,
                profit_DCA: Math.round((setting.get("profit_DCA") + profitDCA_Thua) * 100) / 100,
                bcr: setting.get("bcr") - 1,
                laiChuKy: Math.round((setting.get("laiChuKy") + profitDCA_Thua) * 100) / 100,
            });
            setting.set("bcrSauNhat", Math.min(setting.get("bcrSauNhat"), setting.get("bcr")));

            // SW thua
            const profitSW_Thua = -volSW;
            setting.set({
                solenhthua_SW: setting.get("solenhthua_SW") + 1,
                profit_SW: Math.round((setting.get("profit_SW") + profitSW_Thua) * 100) / 100,
                bcr_sw: setting.get("bcr_sw") - 1,
            });

            // Mốc tổng (giữ nguyên)
            capNhatMoc(profitDCA_Thua + profitSW_Thua);

            // Sync DCA trước, SW sau
            if (!process.env.TOOL_NAME) console.warn("[Sync] TOOL_NAME chưa set trong .env");
            if (!process.env.TOOL_NAME2) console.warn("[Sync] TOOL_NAME2 chưa set trong .env");
            syncKetQua("thua", profitDCA_Thua, process.env.TOOL_NAME);
            syncKetQua("thua", profitSW_Thua, process.env.TOOL_NAME2);

            capNhatStats();
            showThongBao(page, `DCA -${volDCA}K | SW -${volSW}K`, 8000, "#fb2424ff");

            if (tinHieu.thep === 3) {
                await outPhong(page, `❌Biến thôi -> THUA DCA -${volDCA}K | SW -${volSW}K - Thếp 3`, "#fb2424ff");
                return;
            }
            // Thép 1 hoặc 2 → chờ ván mới rồi tiếp tục
            const found = await choVanMoi(80000);
            if (!found) { await outPhong(page, "OutPhong -> Không tìm được Status Start"); return; }
            continue;
        }
    }
}

module.exports = { xulyVoPhong_Util };
