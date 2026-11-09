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
    solenhthua: 0,               // số lệnh thua
    bendat: null,                // "red" | "blue" | null – bên vừa đặt cược
});