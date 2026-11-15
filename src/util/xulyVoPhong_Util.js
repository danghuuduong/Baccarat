"use strict";
const { showThongBao, cancelThongBao } = require("../UI/UI_ThongBao");
const setting = require("../State/setting");
const { TimAnhDuaTrenListPop_Util } = require("./TimAnhDuaTrenListPop_Util");
const { DocKetQuaVang } = require("./DocKetQuaVang");
const { typeRoom, TaoDoChip_Room, ToaDoTab, TOA_DO_THOAT_PHONG, SoTienThep } = require("../config/RoomConfig");
const { LayTinHieu } = require("./Laytinhieu_Util");
const { showLuoiBi, hideLuoiBi, showStats } = require("../UI/UI_InGame");
const { randomSleep, sleep } = require("./Sleep_Util");
const { DocKetQuaXanh } = require("./DocKetQuaXanh");
const { syncKetQua } = require("./syncStats");

const THEP_MAX = SoTienThep.length;

// Thép hiện tại: thắng/out phòng thì về 1, thua thì +1, quá THEP_MAX thì về 1
let thepLocal = 1;

// Cộng thống kê thép: loai = "win" | "thua"
function tangThongKeThep(thep, loai) {
    const tk = setting.get("thongkesolieuthep") || {};
    if (!tk[thep]) tk[thep] = { win: 0, thua: 0 };
    tk[thep][loai]++;
    setting.set("thongkesolieuthep", tk);
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

async function outPhong(page, lyDo, cl = "#d7f706ff") {
    cancelThongBao(page);
    hideLuoiBi(page);
    arraySuDungChinhList = [];
    thepLocal = 1;
    setting.set({
        isDatCuocXong: false,
        sotienuocHienTai: 0,
        bendat: null,
        danhSachTimKiemRa: [],
        phongRoomS: [],
        tabHienTai: 1,
        isStart: true,
    });
    showThongBao(page, `${lyDo}`, 8000, cl);
    await randomSleep(2500, 3500);
    const tab1 = ToaDoTab.find(t => t.tab === 1);
    await page.mouse.click(TOA_DO_THOAT_PHONG.x, TOA_DO_THOAT_PHONG.y);
    await randomSleep(70, 150);
    if (tab1) await page.mouse.click(Math.round(tab1.x), Math.round(tab1.y));
    setting.set("tabHienTai", 1);
    await randomSleep(200, 333);

    setTimeout(() => {
        const { vongLapChupManHinh } = require("./VongLapChupManHinh");
        vongLapChupManHinh(page);
    }, 444);
}

// chenhLech chỉ có giá trị khi benUuThe khác phe (bên mình đánh đang bị thiếu)
const chenhLechHieuLuc = (p) => (p.benUuThe !== p.phe ? p.chenhLech : 0);

async function xulyVoPhong_Util(page, danhSach) {

    if (!danhSach || danhSach.length === 0) return;

    // Chọn phòng: ngam lớn nhất, bằng nhau thì chenhLech hiệu lực lớn nhất, hòa hoàn toàn thì random
    let ungVien = [];
    for (const phong of danhSach) {
        if (ungVien.length === 0) { ungVien = [phong]; continue; }
        const best = ungVien[0];
        const hon =
            phong.ngam !== best.ngam
                ? phong.ngam > best.ngam
                : chenhLechHieuLuc(phong) > chenhLechHieuLuc(best);
        const hoa =
            phong.ngam === best.ngam &&
            chenhLechHieuLuc(phong) === chenhLechHieuLuc(best);

        if (hon) ungVien = [phong];
        else if (hoa) ungVien.push(phong);
    }

    const phongTotNhat = ungVien[Math.floor(Math.random() * ungVien.length)];

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

    // Lấy thẳng arr của phòng đã chọn
    arraySuDungChinhList = [...(phongTotNhat.arr || [])];
    thepLocal = 1;

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
                await click(coords[ten]);
                await randomSleep(222, 333);
                await click(coordBen);
                await randomSleep(222, 333);
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

    while (true) {
        // ── 1. Lấy tín hiệu ────────────────────────────────────────────────
        const tinHieu = LayTinHieu([...arraySuDungChinhList]);

        // Không có tín hiệu: ngồi chờ, đọc kết quả ván kế rồi lấy tín hiệu lại
        if (!tinHieu) {
            showThongBao(page, "Chờ tín hiệu...", 5000, "#d7f706ff");
            const vanMoi = await choVanMoi(50000);
            if (!vanMoi) { await outPhong(page, "OutPhong -> Không tìm được Status Start"); return; }

            const kqCho = await choKetQuaVang(70000);
            if (!kqCho) { await outPhong(page, "OutPhong -> Không đọc được kết quả khi chờ tín hiệu"); return; }

            arraySuDungChinhList.push(kqCho);
            showLuoiBi(page, arraySuDungChinhList);
            continue;
        }

        // ── 2. Tính mức cược và tên bên ────────────────────────────────────
        const thepDanhh = thepLocal;
        const sotienuoc = SoTienThep[thepDanhh - 1];
        const tenBen = tinHieu.tinhieu === "red" ? "Đỏ" : "Xanh";
        const coordBen = tinHieu.tinhieu === "red" ? coords.datCuoc_Red : coords.datCuoc_Blue;

        // ── 3. Chờ bảng chip ổn định rồi chọn chip + đặt bên ───────────────
        await randomSleep(50, 100);
        await datTien(sotienuoc, coordBen);

        // ── 4. Xác nhận ─────────────────────────────────────────────────────
        await randomSleep(200, 300);
        await click(coords.buttonXacNhan);

        // ── 5. Lưu trạng thái + showThongBao (giữ tới khi có kết quả) ──────
        setting.set({
            isDatCuocXong: true,
            sotienuocHienTai: sotienuoc,
            bendat: tinHieu.tinhieu,
            soVonBanDau: setting.get("soVonBanDau") - sotienuoc,
        });
        capNhatStats();
        showThongBao(page, `Đặt ${tenBen} ${sotienuoc}K - Thếp ${thepDanhh}`, 999999, tenBen === "Xanh" ? "#247afbff" : "#e42727ff");

        // ── 6. Chờ rồi tìm kết quả bằng LED vàng ───────────────────────────
        await sleep(10000);
        const ketQua = await choKetQuaVang(150000);

        cancelThongBao(page);
        setting.set("isDatCuocXong", false);

        // ── 7. Không ra kết quả → coi như thua, thoát phòng ────────────────
        if (!ketQua) {
            showThongBao(page, "Lỗi khi check kết quả", 5000, "#fb2424ff");
            setting.set("solenhthua", setting.get("solenhthua") + 1);
            tangThongKeThep(thepDanhh, "thua");
            setting.set("profit", setting.get("profit") - sotienuoc);
            syncKetQua("thua", -sotienuoc);
            capNhatStats();
            await outPhong(page, "OutPhong -> Không đọc được kết quả - coi như thua");
            return;
        }

        // ── 8. Xử lý kết quả: B / P / T ────────────────────────────────────
        const bendat = setting.get("bendat");
        setting.set({ bendat: null, sotienuocHienTai: 0 });

        arraySuDungChinhList.push(ketQua);
        showLuoiBi(page, arraySuDungChinhList);

        // Hòa: hoàn tiền, ở lại, đánh lại thép cũ
        if (ketQua === "T") {
            setting.set("soVonBanDau", setting.get("soVonBanDau") + sotienuoc);
            capNhatStats();
            showThongBao(page, `🤝 HÒA | Vốn: ${setting.get("soVonBanDau")}K`, 8000, "#36ca0dff");

            const found = await choVanMoi(80000);
            if (!found) { await outPhong(page, "Dính Hoà rồi - chạy"); return; }
            continue;
        }

        const ketQuaMau = ketQua === "B" ? "red" : "blue";
        showThongBao(page, `${ketQua === "B" ? "Kết Quả -> ĐỎ" : "Kết Quả -> XANH "}`, 8000, ketQua === "B" ? "#fb2424ff" : "#018cffff");

        if (ketQuaMau === bendat) {
            // ── Thắng: out phòng, thép về 1 (outPhong tự reset) ────────────
            if (bendat === "red") {
                setting.set("solenhwin_Red", setting.get("solenhwin_Red") + 1);
            } else {
                setting.set("solenhWin_Xanh", setting.get("solenhWin_Xanh") + 1);
            }
            tangThongKeThep(thepDanhh, "win");

            // Đỏ thắng chịu phí 5%, xanh ăn đủ
            const lai = bendat === "red"
                ? Math.round(sotienuoc * 0.95 * 100) / 100
                : sotienuoc;

            const vonSau = Math.round((setting.get("soVonBanDau") + sotienuoc + lai) * 100) / 100;
            setting.set("soVonBanDau", vonSau);
            setting.set("profit", Math.round((setting.get("profit") + lai) * 100) / 100);
            setting.set("solenhwin", setting.get("solenhwin") + 1);
            syncKetQua("win", lai);

            capNhatStats();
            await outPhong(page, `✅ Chuồn thôi- Ăn +${lai}K - Thếp ${thepDanhh}`, "#00fd59ff");
            return;

        } else {
            // ── Thua: ở lại, nâng thép, quá THEP_MAX thì về 1 ──────────────
            setting.set("solenhthua", setting.get("solenhthua") + 1);

            if (bendat === "red") {
                setting.set("solenhthua_Red", setting.get("solenhthua_Red") + 1);
            } else {
                setting.set("solenhthua_Xanh", setting.get("solenhthua_Xanh") + 1);
            }
            tangThongKeThep(thepDanhh, "thua");

            setting.set("profit", setting.get("profit") - sotienuoc);
            syncKetQua("thua", -sotienuoc);

            thepLocal = thepDanhh >= THEP_MAX ? 1 : thepDanhh + 1;

            capNhatStats();
            showThongBao(page, `❌ THUA -${sotienuoc}K - Thếp tiếp: ${thepLocal}`, 8000, "#fb2424ff");

            const found = await choVanMoi(80000);
            if (!found) { await outPhong(page, "OutPhong -> Không tìm được Status Start"); return; }
            continue;
        }
    }
}

module.exports = { xulyVoPhong_Util };