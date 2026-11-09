const { createStore } = require("./createStore");

module.exports = createStore({
    isStart: false,
    isRunButon: false,
    phongRoomS: [],              // 8 mảng kết quả
    dangChay: false,             // vòng lặp đang chạy
    danhSachTimKiemRa: [],       // phòng đạt của tab đang đứng
    tabHienTai: 1,               // 1 | 2

    // ── Trạng thái đặt cược ──────────────────────────────────────────────
    isDatCuocXong: false,        // đã xác nhận đặt cược thành công
    soVonBanDau: 2000,           // vốn hiện tại (tự trừ khi đặt, cộng khi thắng/hòa)
    sotienuocHienTai: 0,         // số tiền cược của ván đang chờ kết quả
    profit: 0,                   // tổng lãi/lỗ tính từ lúc khởi động
    solenhwin: 0,                // số lệnh thắng
    solenhwin_Tab1: 0,           // số lệnh thắng Tab 1
    solenhwin_Tab2: 0,           // số lệnh thắng Tab 2
    solenhthua: 0,               // số lệnh thua
    solenhthua_Tab1: 0,          // số lệnh thua Tab 1
    solenhthua_Tab2: 0,          // số lệnh thua Tab 2


    bendat: null,                // "red" | "blue" | null – bên vừa đặt cược
});