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

    solenhwin_Tab1: 0,           // số lệnh thắng Tab 1
    solenhthua_Tab1: 0,          // số lệnh thua Tab 1

    solenhwin_Tab2: 0,           // số lệnh thắng Tab 2
    solenhthua_Tab2: 0,          // số lệnh thua Tab 2


    bendat: null,                // "red" | "blue" | null – bên vừa đặt cược


    soDuMoc: 0,
    tiSoDuong: 0,
    tiSoAm: 0,
    VSTISO: 0,
    VSTISO_Duong_Max: 0,
    VSTISO_Am_Max: 0,
    TonThat_Max: 0,


});