
"use strict";

// ── Sleep cố định ─────────────────────────────────────────────
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Sleep ngẫu nhiên ──────────────────────────────────────────
function randomSleep(min, max) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return sleep(ms);
}

module.exports = {
    sleep,
    randomSleep,
};
