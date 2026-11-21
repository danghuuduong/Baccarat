const { createStore } = require("./createStore");

module.exports = createStore({
    isStart: false,
    isRunButon: false,
    phongRoomS: [],              // 8 mảng kết quả
    dangChay: false,             // vòng lặp đang chạy
    danhSachTimKiemRa: [],       // phòng đạt của tab đang đứng
    tabHienTai: 1,               // 1 | 2
    soChuoiDat: 0,               // cháy liên tiếp từ X chu kỳ trở lên thì đạt

    // ── Trạng thái đặt cược ──────────────────────────────────────────────
    isDatCuocXong: false,        // đã xác nhận đặt cược thành công
    soVonBanDau: 0,           // vốn hiện tại (tự trừ khi đặt, cộng khi thắng/hòa)
    SoTienLonNhatTungSoHuu: 0,// vốn cao nhất từng sở hữu
    sotienuocHienTai: 0,         // số tiền cược của ván đang chờ kết quả
    profit: 0,                   // tổng lãi/lỗ tính từ lúc khởi động
    solenhwin: 0,                // số lệnh thắng
    solenhthua: 0,               // số lệnh thua

    solenhwin_Red: 0,           // số lệnh thắng Tab 1
    solenhthua_Red: 0,          // số lệnh thua Tab 1

    solenhWin_Xanh: 0,           // số lệnh thắng Tab 2
    solenhthua_Xanh: 0,          // số lệnh thua Tab 2

    // Thống kê theo thép: key là số thép 1..5
    thongkesolieuthep: {
        1: { win: 0, thua: 0 },
        2: { win: 0, thua: 0 },
        3: { win: 0, thua: 0 },
        4: { win: 0, thua: 0 },
        5: { win: 0, thua: 0 },
    },

    bendat: null,                // "red" | "blue" | null – bên vừa đặt cược

    TonThat_Max: 0,

    // ── Trạng thái nội tại từng bot (Tỉ số, Khung hoặc Bộ đếm n) ────────
    // Được cập nhật mỗi ván và khôi phục từ MongoDB khi mở bot / Reload
    botTrangThai: {
        "01-TíSố": { tiSo: 0, khungB: -5, khungA: 5 },
        "02-TíSố2K": { n: 1 },                          // bot 2K: bộ đếm nhân
        "03-TíSố8": { tiSo: 0, khungB: -8, khungA: 8 },
        "04-TíSố13": { tiSo: 0, khungB: -13, khungA: 13 },
        "05-TíSố18": { tiSo: 0, khungB: -18, khungA: 18 },
    },
});