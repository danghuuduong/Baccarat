// Các Hàm Khởi đầu , UI , Hàm ,...
async function injectMouseTracker(page) {
    for (const frame of page.frames()) {
        try {
            await frame.evaluate(() => {
                if (document.getElementById("mouse-coord-display")) return;

                const box = document.createElement("div");
                box.id = "mouse-coord-display";
                Object.assign(box.style, {
                    position: "fixed",
                    pointerEvents: "none",
                    zIndex: 2147483647,
                    background: "rgba(0,0,0,0.75)",
                    color: "#00ff00",
                    padding: "2px 6px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    borderRadius: "4px",
                });
                document.body.appendChild(box);

                document.addEventListener("mousemove", (e) => {
                    box.innerText = `X:${e.clientX} Y:${e.clientY}`;
                    box.style.left = e.clientX + 12 + "px";
                    box.style.top = e.clientY + 12 + "px";
                }, true);
            });
        } catch (e) {
            // ignore cross-origin iframe
        }
    }
}

module.exports = {
    injectMouseTracker
};