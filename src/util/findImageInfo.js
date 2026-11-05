// findImageInfo.js – Expose utility to browser: find capture item info by name from captureItems list.
// Usage in main.js: await setupImageFinder(page, () => captureItems);
// Usage in browser:  const info = await window.getImageInfo('Exit_Room');
//                    // returns { x, y, width, height } or null if not found

"use strict";

/**
 * Expose window.getImageInfo(name) to the browser page.
 * @param {import('playwright').Page} page
 * @param {() => Array<{name, x, y, width, height}>} getItemsFn – callback returning current captureItems
 */
async function setupImageFinder(page, getItemsFn) {
    await page.exposeFunction("getImageInfo", (name) => {
        const items = getItemsFn();
        if (!Array.isArray(items)) return null;
        const found = items.find((it) => it.name === name);
        if (!found) return null;
        return {
            x:      found.x,
            y:      found.y,
            width:  found.width,
            height: found.height,
        };
    });
}

module.exports = { setupImageFinder };

