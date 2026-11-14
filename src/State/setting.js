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
    soVonBanDau: 0,              // giữ để tương thích code cũ
    SoTienLonNhatTungSoHuu: 0,   // giữ để tương thích code cũ
    sotienuocHienTai: 0,         // số tiền cược của ván đang chờ kết quả
    profit: 0,                   // giữ để tương thích code cũ
    solenhwin: 0,                // giữ để tương thích code cũ
    solenhthua: 0,               // giữ để tương thích code cũ

    bendat: null,                // "red" | "blue" | null – bên vừa đặt cược

    // ── Mốc tỉ số ────────────────────────────────────────────────────────
    soDuMoc: 0,
    tiSoDuong: 0,
    tiSoAm: 0,
    VSTISO: 0,
    VSTISO_Duong_Max: 0,
    VSTISO_Am_Max: 0,
    TonThat_Max: 0,

    // ── BOT 1: 02-DCA ─────────────────────────────────────────────────────
    soVonBanDau_DCA: 0,
    SoTienLonNhatTungSoHuu_DCA: 0,
    TonThat_Max_DCA: 0,
    profit_DCA: 0,
    solenhwin_DCA: 0,
    solenhthua_DCA: 0,
    bcr: 0,                      // bộ đếm chuỗi (dương: đang thắng, âm: đang thua)
    bcrSauNhat: 0,               // mức sâu nhất bcr từng chạm (luôn <= 0)
    laiChuKy: 0,                 // tổng lãi/thua trong chu kỳ DCA hiện tại

    // ── BOT 2: 03-SW ──────────────────────────────────────────────────────
    soVonBanDau_SW: 0,
    SoTienLonNhatTungSoHuu_SW: 0,
    TonThat_Max_SW: 0,
    profit_SW: 0,
    solenhwin_SW: 0,
    solenhthua_SW: 0,
    bcr_sw: 0,                   // bộ đếm chuỗi SW (luôn <= 0)
});
