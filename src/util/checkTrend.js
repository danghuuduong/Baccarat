// src/Util/checkTrend.js – Chụp 2 lần (trên, dưới), ghép bỏ phòng trùng, đếm Đẹp/Xấu để xác định trend
"use strict";

const setting = require("../State/setting");
const { docBan } = require("./DocBi");
const { CheckChay2Ngam } = require("./CheckChay2Ngam");
const { randomSleep } = require("./Sleep_Util");

const DEP = "Đẹp";
const XAU = "Xấu";

const SO_BI_TOI_THIEU = 6;   // phòng từ 6 bi trở lên mới so trùng
const LECH_TOI_DA = 1;       // cho lệch 1 viên (23 vs 24 vẫn trùng)
const CHENH_LECH_TREND = 2;  // bên nào nhỉnh hơn >= 2 thì là trend

// Đưa chuột vào giữa màn hình rồi lăn xuống như người
async function lanXuongNhuNguoi(page) {
    const { w, h } = await page.evaluate(() => ({
        w: window.innerWidth,
        h: window.innerHeight,
    }));

    await page.mouse.move(w / 2, h / 2);

    const soLan = setting.get("tabHienTai") === 1 ? 4 : 3;
    for (let i = 0; i < soLan; i++) {
        await page.mouse.wheel(0, 3333);
        await randomSleep(55, 60);
    }
}

// Lăn ngược lên đầu trang (dư 1 lần cho chắc)
async function lanLenNhuNguoi(page) {
    const { w, h } = await page.evaluate(() => ({
        w: window.innerWidth,
        h: window.innerHeight,
    }));

    await page.mouse.move(w / 2, h / 2);

    for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, -3333);
        await randomSleep(55, 60);
    }
}

// Chỉ giữ phòng có bi (phòng thiếu/rỗng bỏ)
function layPhongCoBi(ds) {
    return (ds || []).filter((a) => Array.isArray(a) && a.length > 0);
}

// 2 phòng coi là cùng 1 phòng: cả 2 >= 6 bi, lệch tối đa 1 viên, phần chung giống nhau
function cungPhong(a, b) {
    if (a.length < SO_BI_TOI_THIEU || b.length < SO_BI_TOI_THIEU) return false;
    if (Math.abs(a.length - b.length) > LECH_TOI_DA) return false;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// Tìm k lớn nhất: k phòng cuối của "trên" trùng k phòng đầu của "dưới".
// Bỏ k phòng đó bên "trên", lấy bản "dưới" (mới hơn).
function ghepBoTrung(tren, duoi) {
    const kToiDa = Math.min(tren.length, duoi.length);
    for (let k = kToiDa; k >= 1; k--) {
        let khop = true;
        for (let i = 0; i < k; i++) {
            if (!cungPhong(tren[tren.length - k + i], duoi[i])) {
                khop = false;
                break;
            }
        }
        if (khop) return [...tren.slice(0, tren.length - k), ...duoi];
    }
    return [...tren, ...duoi];
}

/**
 * Chụp trên -> lăn xuống -> chụp dưới -> lăn lên. Ghép, đếm, trả trend.
 * @param {import('playwright').Page} page
 * @returns {Promise<{trend: "Đẹp"|"Xấu"|null, tongDep: number, tongXau: number, soPhong: number}>}
 */
async function checkTrend(page) {
    // Lần 1: phần trên
    const tren = layPhongCoBi(await docBan(page));

    // Lần 2: phần dưới
    await lanXuongNhuNguoi(page);
    await randomSleep(410, 460);
    const duoi = layPhongCoBi(await docBan(page));

    // Trả trang về đầu
    await lanLenNhuNguoi(page);
    await randomSleep(410, 460);

    const cacPhong = ghepBoTrung(tren, duoi);

    // Cộng Đẹp/Xấu của tất cả phòng
    let tongDep = 0;
    let tongXau = 0;
    for (const arr of cacPhong) {
        const kq = CheckChay2Ngam(arr);
        tongDep += kq.soDep;
        tongXau += kq.soXau;
    }

    let trend = null;
    console.log(tongDep, tongXau)

    if (tongDep - tongXau >= CHENH_LECH_TREND) trend = DEP;
    else if (tongXau - tongDep >= CHENH_LECH_TREND) trend = XAU;

    return { trend, tongDep, tongXau, soPhong: cacPhong.length };
}

module.exports = { checkTrend };