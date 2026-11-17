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

const THEP_MAX = SoTienThep.length;

// Tên tool của bot đánh ngược (chỉ sync lên API, không đụng logic bot chính)
const TEN_NGUOC = "06-Đánh Ngược thằng 06";

// Lãi của bot ngược khi thắng: bot cũ đánh Xanh -> bot ngược đánh Đỏ -> bị phí 5%
function laiNguoc(benCu, sotienuoc) {
    return benCu === "blue"
        ? Math.round(sotienuoc * 0.95 * 100) / 100
        : sotienuoc;
}

// Thép hiện tại: thắng/out phòng thì về 1, thua thì +1, quá THEP_MAX thì về 1
let thepLocal = 1;
// Số ván ảo thua liên tiếp. Thua ảo +1, thắng thật thì về 0
let countAO = 0;

// Cộng thống kê thép: loai = "win" | "thua"
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

// chenhLech chỉ có giá trị khi benUuThe khác phe (bên mình đánh đang bị thiếu)
const chenhLechHieuLuc = (p) => (p.benUuThe !== p.phe ? p.chenhLech : 0);

async function xulyVoPhong_Util(page, danhSach) {
    if (isDung()) return;
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

    if (isDung()) return;

    const phongTotNhat = ungVien[Math.floor(Math.random() * ungVien.length)];

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
     ${roomType === typeRoom.room_a ? "Sảnh Sexy" : "Sảnh Bacarat"} | Ngầm: ${phongTotNhat.ngam}`;

    showThongBao(page, thongBao, 5000);

    // Hiển thị lưới bi + thống kê ban đầu
    showLuoiBi(page, arraySuDungChinhList);
    showStats(page, buildStats());

    await vongLapDatCuoc(page, roomType, phongTotNhat.phe);

    return roomType;
}

// ─── Vòng lặp đặt cược chính ─────────────────────────────────────────────────
async function vongLapDatCuoc(page, roomType, phe) {
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

        // ── 2. Tính mức cược, tên bên, ảo hay thật ─────────────────────────
        const thepDanhh = thepLocal;
        const sotienuoc = SoTienThep[thepDanhh - 1];

        const soChuoiDat = setting.get("soChuoiDat");
        const isThat = !(soChuoiDat > 0) || countAO >= soChuoiDat;

        // Phe Đẹp: đánh cùng chiều tín hiệu | Phe Xấu: đánh ngược tín hiệu
        const benTheoCau = tinHieu.tinhieu === "d" ? "red" : "blue";
        const benDanh = phe === "Xấu" ? (benTheoCau === "red" ? "blue" : "red") : benTheoCau;
        const tenBen = benDanh === "red" ? "Đỏ" : "Xanh";
        const coordBen = benDanh === "red" ? coords.datCuoc_Red : coords.datCuoc_Blue;
        const mauTB = tenBen === "Xanh" ? "#247afbff" : "#e42727ff";

        if (isThat) {
            // ── 3. Ván THẬT: chọn chip + đặt bên ───────────────────────────
            await randomSleep(50, 100);
            if (isDung()) { await outPhong(page, "Đã bấm Dừng - Hủy cược"); return; }
            await datTien(sotienuoc, coordBen);

            // ── 4. Xác nhận ─────────────────────────────────────────────────
            if (isDung()) { await outPhong(page, "Đã bấm Dừng - Hủy xác nhận cược"); return; }
            await randomSleep(200, 300);
            await click(coords.buttonXacNhan);

            // ── 5. Lưu trạng thái ──────────────────────────────────────────
            setting.set({
                isDatCuocXong: true,
                sotienuocHienTai: sotienuoc,
                bendat: benDanh,
                soVonBanDau: setting.get("soVonBanDau") - sotienuoc,
            });
            capNhatStats();

            showThongBao(page, `Đặt ${tenBen} ${sotienuoc}K
        - Thếp ${thepDanhh} | 
        Cầu: ${tinHieu.cauphatHien} | 
        ${phe === "Xấu" ? "Bẻ cầu" : "Theo cầu"}`,
                999999, mauTB);
        } else {
            // ── Ván ẢO: không đặt tiền, không xác nhận, không trừ vốn ──────
            showThongBao(page, `[ẢO ${countAO}/${soChuoiDat}] Giả đặt ${tenBen}
        Cầu: ${tinHieu.cauphatHien} | 
        ${phe === "Xấu" ? "Bẻ cầu" : "Theo cầu"}`,
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

            // Ván ảo: không tính gì, chỉ out
            if (!isThat) {
                await outPhong(page, "OutPhong -> Không đọc được kết quả (ván ảo)");
                return;
            }

            showThongBao(page, "Lỗi khi check kết quả", 5000, "#fb2424ff");
            setting.set("solenhthua", setting.get("solenhthua") + 1);
            tangThongKeThep(thepDanhh, "thua");
            setting.set("profit", setting.get("profit") - sotienuoc);
            syncKetQua("thua", -sotienuoc);
            // Bot ngược: không đọc được kết quả -> cũng xử thua, trừ đủ sotienuoc
            syncKetQua("thua", -sotienuoc, TEN_NGUOC);
            capNhatStats();
            await outPhong(page, "OutPhong -> Không đọc được kết quả - coi như thua");
            return;
        }

        // ── 8. Xử lý kết quả: B / P / T ────────────────────────────────────
        const bendat = benDanh;
        if (isThat) setting.set({ bendat: null, sotienuocHienTai: 0 });

        arraySuDungChinhList.push(ketQua);
        showLuoiBi(page, arraySuDungChinhList);

        // Hòa: không tính, ở lại đánh tiếp (thật thì hoàn tiền)
        if (ketQua === "T") {
            if (isThat) {
                setting.set("soVonBanDau", setting.get("soVonBanDau") + sotienuoc);
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

        // ── Ván ẢO: thắng thì countAO = 0, thua thì +1, rồi out ────────────
        if (!isThat) {
            const thangAo = ketQuaMau === bendat;
            if (thangAo) countAO = 0;
            else countAO++;
            await outPhong(
                page,
                thangAo
                    ? `Ảo THẮNG - Ảo thua: ${countAO}/${soChuoiDat}`
                    : `Ảo THUA - Ảo thua: ${countAO}/${soChuoiDat}`,
                thangAo ? "#00fd59ff" : "#fb2424ff"
            );
            return;
        }

        // ── Ván THẬT ───────────────────────────────────────────────────────
        if (ketQuaMau === bendat) {
            // Thắng: countAO về 0, thép về 1, out phòng
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
            // Bot ngược: bot cũ thắng -> bot ngược thua, trừ đủ sotienuoc
            syncKetQua("thua", -sotienuoc, TEN_NGUOC);
            thepLocal = 1;
            countAO = 0;
            capNhatStats();
            await outPhong(page, `✅ Chuồn thôi- Ăn +${lai}K - Thếp ${thepDanhh}`, "#00fd59ff");
            return;

        } else {
            // Thua: countAO giữ nguyên (ván sau đánh thật tiếp), thép +1, out phòng
            setting.set("solenhthua", setting.get("solenhthua") + 1);

            if (bendat === "red") {
                setting.set("solenhthua_Red", setting.get("solenhthua_Red") + 1);
            } else {
                setting.set("solenhthua_Xanh", setting.get("solenhthua_Xanh") + 1);
            }
            tangThongKeThep(thepDanhh, "thua");

            setting.set("profit", setting.get("profit") - sotienuoc);
            syncKetQua("thua", -sotienuoc);
            // Bot ngược: bot cũ thua -> bot ngược thắng
            syncKetQua("win", laiNguoc(bendat, sotienuoc), TEN_NGUOC);
            capNhatStats();

            thepLocal = thepDanhh >= THEP_MAX ? 1 : thepDanhh + 1;

            await outPhong(page, `Dí rồi chạy thôi ❌ THUA -${sotienuoc}K - Thếp tiếp: ${thepLocal}`, "#fb2424ff");
            return;
        }
    }

    // Nếu thoát vòng lặp do isRunButon = false
    if (isDung()) {
        await outPhong(page, "Đã bấm Dừng - Thoát phòng");
    }
}

module.exports = { xulyVoPhong_Util };