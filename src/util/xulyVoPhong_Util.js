"use strict";
const { showThongBao, cancelThongBao } = require("../UI/UI_ThongBao");
const setting = require("../State/setting");
const { TimAnhDuaTrenListPop_Util } = require("./TimAnhDuaTrenListPop_Util");
const { DocKetQuaVang } = require("./DocKetQuaVang");
const { typeRoom, /* typeKetQua, */ TaoDoChip_Room, ToaDoTab } = require("../config/RoomConfig");
const { LayTinHieu } = require("./Laytinhieu_Util");
const { showLuoiBi, hideLuoiBi, showStats } = require("../UI/UI_InGame");

// Mảng bi đang dùng để lấy tín hiệu
let arraySuDungChinhList = [];
let daChotSo = false;

async function xulyVoPhong_Util(page, danhSach) {

    if (!danhSach || danhSach.length === 0) return;

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
    let roomType = await TimAnhDuaTrenListPop_Util(page, [typeRoom.room_a, typeRoom.room_b], 4000);

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
    daChotSo = true;

    // ── Phần đặt cược ─────────────────────────────────────────────────────
    const thongBao = `Tab-${phongTotNhat.tab}, Phòng: ${phongTotNhat.phong}, Ngầm: ${phongTotNhat.ngam}, Thếp: ${phongTotNhat.infoTinHieu.thep} | ${roomType}`;
    showThongBao(page, thongBao, 5000);

    // Hiển thị lưới bi + thống kê ban đầu
    showLuoiBi(page, arraySuDungChinhList);
    showStats(page, {
        soVonBanDau: setting.get("soVonBanDau"),
        profit: setting.get("profit"),
        solenhwin: setting.get("solenhwin"),
        solenhthua: setting.get("solenhthua"),
    });

    await vongLapDatCuoc(page, roomType);

    return roomType;
}

// ─── Vòng lặp đặt cược chính ─────────────────────────────────────────────────
async function vongLapDatCuoc(page, roomType) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const coords = TaoDoChip_Room[roomType];
    // const kq = typeKetQua[roomType];
    const sotienuocList = [20, 50, 110];
    const click = async (coord) => page.mouse.click(Math.round(coord.x), Math.round(coord.y));

    // Chip ưu tiên số to trước
    const CHIP_THU_TU = [
        ["chip1000", 1000],
        ["chip500", 500],
        ["chip100", 100],
        ["chip50", 50],
        ["chip25", 25],
        ["chip10", 10],
    ];

    // Mỗi chip: chọn chip -> click bên cược
    async function datTien(tien, coordBen) {
        let con = tien;
        for (const [ten, gia] of CHIP_THU_TU) {
            while (con >= gia) {
                await click(coords[ten]);
                await sleep(300);
                await click(coordBen);
                await sleep(300);
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
            await sleep(200);
        }
        return null;
    }

    async function outPhong(lyDo) {
        cancelThongBao(page);
        hideLuoiBi(page);
        arraySuDungChinhList = [];
        daChotSo = false;
        setting.set({
            isDatCuocXong: false,
            sotienuocHienTai: 0,
            bendat: null,
            danhSachTimKiemRa: [],
            phongRoomS: [],
            tabHienTai: 1,
            isStart: true,
        });
        showThongBao(page, `Out phòng: ${lyDo}`, 8000, "#d7f706ff");
        sleep(1500);
        // click tab 1 để thoát phòng
        const tab1 = ToaDoTab.find(t => t.tab === 1);
        await page.mouse.click(Math.round(tab1.x), Math.round(tab1.y));
        await new Promise(r => setTimeout(r, 1000));

        setTimeout(() => {
            const { vongLapChupManHinh } = require("./VongLapChupManHinh");
            vongLapChupManHinh(page);
        }, 500);
    }

    const capNhatStats = () => {
        showStats(page, {
            soVonBanDau: setting.get("soVonBanDau"),
            profit: setting.get("profit"),
            solenhwin: setting.get("solenhwin"),
            solenhthua: setting.get("solenhthua"),
        });
    };

    while (true) {
        // ── 1. Lấy tín hiệu ────────────────────────────────────────────────
        const tinHieu = LayTinHieu([...arraySuDungChinhList]);

        if (!tinHieu) {
            await outPhong("Không có tín hiệu");
            return;
        }

        // ── 2. Tính mức cược và tên bên ────────────────────────────────────
        const sotienuoc = sotienuocList[tinHieu.thep - 1];
        const tenBen = tinHieu.tinhieu === "red" ? "Đỏ" : "Xanh";
        const coordBen = tinHieu.tinhieu === "red" ? coords.datCuoc_Red : coords.datCuoc_Blue;

        // ── 3. Chọn chip + đặt bên ─────────────────────────────────────────
        await datTien(sotienuoc, coordBen);

        // ── 4. Xác nhận ─────────────────────────────────────────────────────
        await sleep(1000);
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
        await sleep(17000);
        const ketQua = await choKetQuaVang(35000);

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
            setting.set("profit", setting.get("profit") - sotienuoc);
            capNhatStats();
            await outPhong("Không đọc được kết quả - coi như thua");
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
                await outPhong("Hòa thép 3");
                return;
            }

            // Hòa thép 1, 2 → chờ ván mới rồi tiếp tục
            const found = await TimAnhDuaTrenListPop_Util(page, ["Status_BatDauVandau"], 60000);
            if (!found) { await outPhong("Timeout chờ ván mới (sau hòa)"); return; }
            continue;
        }

        const ketQuaMau = ketQua === "B" ? "red" : "blue";
        showThongBao(page, `${ketQua === "B" ? "Kết Quả -> ĐỎ" : "Kết Quả -> XANH "}`, 8000, ketQua === "B" ? "#fb2424ff" : "#018cffff");

        if (ketQuaMau === bendat) {
            // ── Thắng ──────────────────────────────────────────────────────
            const vonSau = setting.get("soVonBanDau") + sotienuoc * 2;
            setting.set("soVonBanDau", vonSau);
            setting.set("profit", setting.get("profit") + sotienuoc);
            setting.set("solenhwin", setting.get("solenhwin") + 1);
            capNhatStats();
            showThongBao(page, `✅ Ăn +${sotienuoc}K`, 8000, "#32fb24ff");
            await outPhong("Thắng");
            return;

        } else {
            // ── Thua ───────────────────────────────────────────────────────
            setting.set("solenhthua", setting.get("solenhthua") + 1);
            setting.set("profit", setting.get("profit") - sotienuoc);
            capNhatStats();
            showThongBao(page, `❌ THUA -${sotienuoc}K `, 8000, "#fb2424ff");

            if (tinHieu.thep === 3) {
                await outPhong("Thua thép 3");
                return;
            }

            // Thép 1 hoặc 2 → chờ ván mới rồi tiếp tục
            const found = await TimAnhDuaTrenListPop_Util(page, ["Status_BatDauVandau"], 60000);
            if (!found) { await outPhong("Timeout chờ ván mới (sau thua)"); return; }
            continue;
        }
    }
}

module.exports = { xulyVoPhong_Util };