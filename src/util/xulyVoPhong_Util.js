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

// Mảng bi đang dùng để lấy tín hiệu
let arraySuDungChinhList = [];
let isMatTienTRongPhongNay = false;

async function xulyVoPhong_Util(page, danhSach) {

    if (!danhSach || danhSach.length === 0) return;
    isMatTienTRongPhongNay = false;

    // Chọn phòng có ngam lớn nhất; bằng nhau thì chọn phòng có thép lớn nhất
    const phongTotNhat = danhSach.reduce((max, phong) => {
        if (phong.ngam !== max.ngam) return phong.ngam > max.ngam ? phong : max;
        return phong.infoTinHieu.thep > max.infoTinHieu.thep ? phong : max;
    });

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
        showThongBao(page, "Có lỗi khi vô phòng, khởi động tìm lại vòng lặp", 10000, "#e91f1fff");
        setting.set("danhSachTimKiemRa", []);
        setting.set("tabHienTai", 1);
        setting.set("isStart", true);

        setTimeout(() => {
            const { vongLapChupManHinh } = require("./VongLapChupManHinh");
            vongLapChupManHinh(page);
        }, 0);
        return;
    }

    // Không so khớp lưới nữa: lấy thẳng arr của phòng đã chọn
    arraySuDungChinhList = [...(phongTotNhat.arr || [])];

    // ── Phần đặt cược ─────────────────────────────────────────────────────
    const thongBao = `Phòng: ${phongTotNhat.phong} =>  ${roomType === typeRoom.room_a ? "Sảnh Sexy" : "Sảnh Bacarat"}`;
    showThongBao(page, thongBao, 5000);

    const tab = phongTotNhat.tab || setting.get("tabHienTai") || 1;

    // Hiển thị lưới bi + thống kê ban đầu
    showLuoiBi(page, arraySuDungChinhList);
    showStats(page, {
        soVonBanDau: setting.get("soVonBanDau"),
        profit: setting.get("profit"),
        solenhwin: setting.get("solenhwin"),
        solenhthua: setting.get("solenhthua"),
        solenhwin_Tab1: setting.get("solenhwin_Tab1"),
        solenhthua_Tab1: setting.get("solenhthua_Tab1"),
        solenhwin_Tab2: setting.get("solenhwin_Tab2"),
        solenhthua_Tab2: setting.get("solenhthua_Tab2"),
        soChuoiDat: setting.get("soChuoiDat"),
        SoTienLonNhatTungSoHuu: setting.get("SoTienLonNhatTungSoHuu"),
    });

    await vongLapDatCuoc(page, roomType, tab);

    return roomType;
}

// ─── Vòng lặp đặt cược chính ─────────────────────────────────────────────────
async function vongLapDatCuoc(page, roomType, tab = setting.get("tabHienTai") || 1) {
    const coords = TaoDoChip_Room[roomType];
    // const kq = typeKetQua[roomType];
    const sotienuocList = [20, 50, 110];

    // Di chuột tới điểm rồi mới click (để game nhận hover)
    const click = async (coord) => {
        const x = Math.round(coord.x), y = Math.round(coord.y);
        await page.mouse.move(x, y, { steps: 4 });
        await randomSleep(150, 222);
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
                await randomSleep(455, 555);
                await click(coordBen);
                await randomSleep(455, 555);
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
                console.log(`[choVanMoi] 🟢 XANH LÁ tìm thấy (sau ${Date.now() - start}ms)`);
                return true;
            }
            const anh = await TimAnhDuaTrenListPop_Util(page, ["Status_BatDauVandau"], 200);
            if (anh) {
                console.log(`[choVanMoi] 🖼️ ẢNH tìm thấy (sau ${Date.now() - start}ms)`);
                return true;
            }
            await sleep(100);
        }
        console.log(`[choVanMoi] ❌ Hết giờ ${timeoutMs}ms, không ai tìm thấy`);
        return false;
    }
    async function outPhong(lyDo, cl = "#d7f706ff") {
        isMatTienTRongPhongNay = false;
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
            isStart: true,
        });
        showThongBao(page, `${lyDo}`, 8000, cl);
        await randomSleep(2500, 3500);
        // click tab 1 để thoát phòng
        const tab1 = ToaDoTab.find(t => t.tab === 1);
        await page.mouse.click(TOA_DO_THOAT_PHONG.x, TOA_DO_THOAT_PHONG.y);
        await randomSleep(70, 150);
        await page.mouse.click(Math.round(tab1.x), Math.round(tab1.y));
        setting.set("tabHienTai", 1);
        await randomSleep(200, 333);

        setTimeout(() => {
            const { vongLapChupManHinh } = require("./VongLapChupManHinh");
            vongLapChupManHinh(page);
        }, 444);
    }

    const capNhatStats = () => {
        showStats(page, {
            soVonBanDau: setting.get("soVonBanDau"),
            profit: setting.get("profit"),
            solenhwin: setting.get("solenhwin"),
            solenhthua: setting.get("solenhthua"),
            solenhwin_Tab1: setting.get("solenhwin_Tab1"),
            solenhthua_Tab1: setting.get("solenhthua_Tab1"),
            solenhwin_Tab2: setting.get("solenhwin_Tab2"),
            solenhthua_Tab2: setting.get("solenhthua_Tab2"),
            soChuoiDat: setting.get("soChuoiDat"),
            SoTienLonNhatTungSoHuu: setting.get("SoTienLonNhatTungSoHuu"),
        });
    };

    while (true) {
        // ── 1. Lấy tín hiệu ────────────────────────────────────────────────
        const tinHieu = LayTinHieu([...arraySuDungChinhList], isMatTienTRongPhongNay);

        if (!tinHieu) {
            await outPhong("OutPhong- Không có tín hiệu");
            return;
        }

        // ── 2. Tính mức cược và tên bên ────────────────────────────────────
        const sotienuoc = sotienuocList[tinHieu.thep - 1];
        const tenBen = tinHieu.tinhieu === "red" ? "Đỏ" : "Xanh";
        const coordBen = tinHieu.tinhieu === "red" ? coords.datCuoc_Red : coords.datCuoc_Blue;

        // ── 3. Chờ bảng chip ổn định rồi chọn chip + đặt bên ───────────────
        await sleep(555);
        await randomSleep(555, 633);
        await datTien(sotienuoc, coordBen);

        // ── 4. Xác nhận ─────────────────────────────────────────────────────
        await randomSleep(300, 500);

        await click(coords.buttonXacNhan);

        // ── 5. Lưu trạng thái + showThongBao (giữ tới khi có kết quả) ──────
        setting.set({
            isDatCuocXong: true,
            sotienuocHienTai: sotienuoc,
            bendat: tinHieu.tinhieu,
            soVonBanDau: setting.get("soVonBanDau") - sotienuoc,
        });
        capNhatStats();
        showThongBao(page, `Đặt ${tenBen} ${sotienuoc}K - Thếp ${tinHieu.thep}`, 999999, tenBen === "Xanh" ? "#247afbff" : "#e42727ff");

        // ── 6. Chờ 15s rồi tìm kết quả bằng LED vàng (30s) ─────────────────
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

        // ── 7. Không ra kết quả → coi như thua, thoát phòng ────────────────
        if (!ketQua) {
            showThongBao(page, "Lỗi khi check kết quả", 5000, "#fb2424ff");
            setting.set("solenhthua", setting.get("solenhthua") + 1);
            if (tab === 1) {
                setting.set("solenhthua_Tab1", setting.get("solenhthua_Tab1") + 1);
            } else if (tab === 2) {
                setting.set("solenhthua_Tab2", setting.get("solenhthua_Tab2") + 1);
            }
            setting.set("profit", setting.get("profit") - sotienuoc);
            capNhatStats();
            await outPhong("OutPhong -> Không đọc được kết quả - coi như thua");
            return;
        }

        // ── 8. Xử lý kết quả: B / P / T ────────────────────────────────────
        const bendat = setting.get("bendat");
        setting.set({ bendat: null, sotienuocHienTai: 0 });

        arraySuDungChinhList.push(ketQua);
        showLuoiBi(page, arraySuDungChinhList);


        if (ketQua === "T") {
            // Hòa → hoàn lại tiền
            setting.set("soVonBanDau", setting.get("soVonBanDau") + sotienuoc);
            capNhatStats();
            showThongBao(page, `🤝 HÒA | Vốn: ${setting.get("soVonBanDau")}K`, 8000, "#36ca0dff");

            if (tinHieu.thep === 3) {
                await outPhong(`🤝Lượn thôi  HÒA`, "#36ca0dff");
                return;
            }

            // Hòa thép 1, 2 → chờ ván mới rồi tiếp tục
            const found = await choVanMoi(80000);
            if (!found) { await outPhong("Dính Hoà rồi - chạy"); return; }
            continue;
        }

        const ketQuaMau = ketQua === "B" ? "red" : "blue";
        showThongBao(page, `${ketQua === "B" ? "Kết Quả -> ĐỎ" : "Kết Quả -> XANH "}`, 8000, ketQua === "B" ? "#fb2424ff" : "#018cffff");

        if (ketQuaMau === bendat) {
            // ── Thắng ──────────────────────────────────────────────────────
            // Đỏ thắng chịu phí 5%, xanh ăn đủ
            const lai = bendat === "red"
                ? Math.round(sotienuoc * 0.95 * 100) / 100
                : sotienuoc;

            const vonSau = Math.round((setting.get("soVonBanDau") + sotienuoc + lai) * 100) / 100;
            setting.set("soVonBanDau", vonSau);
            setting.set("profit", Math.round((setting.get("profit") + lai) * 100) / 100);
            setting.set("solenhwin", setting.get("solenhwin") + 1);
            if (tab === 1) {
                setting.set("solenhwin_Tab1", setting.get("solenhwin_Tab1") + 1);
            } else if (tab === 2) {
                setting.set("solenhwin_Tab2", setting.get("solenhwin_Tab2") + 1);
            }
            capNhatStats();
            await outPhong(`✅ Chuồn thôi- Ăn +${lai}K`, "#00fd59ff");
            return;

        } else {
            // ── Thua ───────────────────────────────────────────────────────
            setting.set("solenhthua", setting.get("solenhthua") + 1);
            if (tab === 1) {
                setting.set("solenhthua_Tab1", setting.get("solenhthua_Tab1") + 1);
            } else if (tab === 2) {
                setting.set("solenhthua_Tab2", setting.get("solenhthua_Tab2") + 1);
            }

            setting.set("profit", setting.get("profit") - sotienuoc);
            capNhatStats();

            if (tinHieu.thep === 3) {
                await outPhong(`❌Biến thôi -> THUA -${sotienuoc}K - Thếp 3 - Nhà cái bóp Dí rồi `, "#fb2424ff");
                return;
            } else {
                showThongBao(page, `❌ THUA -${sotienuoc}K `, 8000, "#fb2424ff");
            }
            isMatTienTRongPhongNay = true;

            // Thép 1 hoặc 2 → chờ ván mới rồi tiếp tục
            const found = await choVanMoi(80000);
            if (!found) { await outPhong("OutPhong -> Không tìm được Status Start"); return; }
            continue;
        }
    }
}

module.exports = { xulyVoPhong_Util };