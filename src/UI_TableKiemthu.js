async function UI_TableKiemthu(page) {
  // Load dữ liệu cũ từ Node.js
  const existingItems = await page.evaluate(async () => {
    try { return await window.getCaptureItems(); } catch (e) { return []; }
  });

  await page.evaluate((initItems) => {
    if (document.getElementById("ui-Table-KiemThu")) return;

    // ── STATE ──
    let captureList = Array.isArray(initItems) ? initItems.slice() : [];
    let isCapturing = false;
    let isHidden = true;
    let captureW = 0, captureH = 0;
    let pendingCapture = null;
    let currentCapturePos = null;
    let mouseMoveHandler = null;
    let mouseClickHandler = null;
    let captureKeyDownHandler = null;

    // Theo dõi checker nào đang chạy (theo name)
    const runningCheckers = new Set();

    // ── STYLE ──
    const style = document.createElement("style");
    style.textContent = [
      "#ui-Table-KiemThu * { box-sizing: border-box; }",

      // Table
      "#kt-table { width:100%; border-collapse:collapse; font-size:10px; }",
      "#kt-table th { background:#1e3a5f; color:#fff; padding:4px 5px; text-align:center; font-weight:bold; border:1px solid #ccc; }",
      "#kt-table td { padding:3px 5px; text-align:center; border:1px solid #ddd; vertical-align:middle; }",
      "#kt-table tr:nth-child(even) td { background:#f5f8ff; }",
      "#kt-table tr:hover td { background:#dbeafe; }",

      // Inputs
      ".kt-input { width:52px; padding:3px 4px; border:1px solid #999; border-radius:4px; font-size:11px; text-align:center; outline:none; }",
      ".kt-input:focus { border-color:#2563eb; }",

      // Nút bắt đầu
      "#kt-btn-start { padding:4px 10px; border:none; border-radius:4px; font-size:11px; font-weight:bold; cursor:not-allowed; background:#ccc; color:#888; transition:background .2s; }",
      "#kt-btn-start.active { background:#2563eb; color:#fff; cursor:pointer; }",
      "#kt-btn-start.active:hover { background:#1d4ed8; }",

      // Nút huỷ chụp
      "#kt-btn-cancel-capture { padding:4px 8px; border:none; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer; background:#ef4444; color:#fff; transition:background .2s; }",
      "#kt-btn-cancel-capture:hover { background:#dc2626; }",

      // Nút trong table
      ".btn-del { padding:2px 6px; border:none; border-radius:3px; font-size:10px; cursor:pointer; background:#ef4444; color:#fff; margin-right:3px; }",
      ".btn-del:hover { background:#dc2626; }",
      ".btn-edit { padding:2px 6px; border:none; border-radius:3px; font-size:10px; cursor:pointer; background:#f59e0b; color:#fff; margin-right:3px; }",
      ".btn-edit:hover { background:#d97706; }",
      ".btn-copy { padding:2px 6px; border:none; border-radius:3px; font-size:10px; cursor:pointer; background:#10b981; color:#fff; margin-right:3px; }",
      ".btn-copy:hover { background:#059669; }",
      ".btn-check { padding:2px 6px; border:none; border-radius:3px; font-size:10px; cursor:pointer; background:#2563eb; color:#fff; }",
      ".btn-check:hover { background:#1d4ed8; }",

      // Overlay
      "#kt-overlay { position:fixed; pointer-events:none; border:2px dashed #e11d48; background:rgba(225,29,72,0.08); z-index:2147483646; display:none; box-shadow:0 0 0 1px rgba(0,0,0,0.3); }",

      // Backdrop che phủ toàn màn hình khi chụp
      "#kt-capture-backdrop { position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:2147483640; background:rgba(0,0,0,0.001); cursor:crosshair; display:none; }",

      // Popup
      "#kt-popup { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#fff; border:2px solid #1e3a5f; border-radius:8px; padding:16px 20px; z-index:2147483647; min-width:260px; box-shadow:0 4px 20px rgba(0,0,0,0.3); font-family:monospace; font-size:12px; display:none; }",
      "#kt-popup h4 { margin:0 0 10px; color:#1e3a5f; font-size:13px; }",
      "#kt-popup-input { width:100%; padding:5px 8px; border:1px solid #999; border-radius:4px; font-size:12px; margin-bottom:10px; outline:none; }",
      "#kt-popup-input:focus { border-color:#2563eb; }",
      ".kt-popup-btns { display:flex; gap:8px; justify-content:flex-end; }",
      "#kt-popup-ok { padding:4px 14px; background:#2563eb; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px; }",
      "#kt-popup-ok:hover { background:#1d4ed8; }",
      "#kt-popup-cancel { padding:4px 10px; background:#e5e7eb; color:#333; border:none; border-radius:4px; cursor:pointer; font-size:12px; }",
      "#kt-popup-cancel:hover { background:#d1d5db; }"
    ].join("\n");
    document.head.appendChild(style);

    // ── CONTAINER CHÍNH ──
    const container = document.createElement("div");
    container.id = "ui-Table-KiemThu";
    Object.assign(container.style, {
      position: "fixed",
      top: "33px",
      right: "5px",
      width: "660px",
      backgroundColor: "#fff",
      border: "1px solid #000",
      borderRadius: "8px",
      padding: "10px 12px 14px 12px",
      fontSize: "12px",
      fontFamily: "monospace",
      zIndex: 999902,
      boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
      display: "none",
    });

    // Tiêu đề
    const title = document.createElement("div");
    title.textContent = "🎯 KIỂM THỬ ẢNH";
    Object.assign(title.style, { fontWeight: "bold", marginBottom: "8px", textAlign: "center", color: "#1e3a5f", fontSize: "13px" });
    container.appendChild(title);

    // Vùng table (scroll)
    const tableWrap = document.createElement("div");
    Object.assign(tableWrap.style, { marginBottom: "10px", maxHeight: "200px", overflowY: "auto" });

    const table = document.createElement("table");
    table.id = "kt-table";
    table.innerHTML = "<thead><tr><th>Ảnh</th><th>Name</th><th>X</th><th>Y</th><th>W</th><th>H</th><th style='min-width:230px'>Active</th></tr></thead><tbody id='kt-tbody'></tbody>";
    tableWrap.appendChild(table);

    const emptyMsg = document.createElement("div");
    emptyMsg.id = "kt-empty";
    emptyMsg.textContent = "Chưa có ảnh nào. Hãy chụp vùng bên dưới.";
    Object.assign(emptyMsg.style, { textAlign: "center", color: "#999", padding: "8px 0", fontSize: "10px" });
    tableWrap.appendChild(emptyMsg);
    container.appendChild(tableWrap);

    // Đường kẻ ngang
    const hr = document.createElement("hr");
    Object.assign(hr.style, { border: "none", borderTop: "1px solid #ddd", margin: "8px 0" });
    container.appendChild(hr);

    // Vùng input X/Y/W/H + nút
    const inputRow = document.createElement("div");
    Object.assign(inputRow.style, { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" });

    const lblX = document.createElement("label");
    lblX.textContent = "X:";
    Object.assign(lblX.style, { fontSize: "11px", color: "#555" });

    const inpX = document.createElement("input");
    inpX.id = "kt-inp-x";
    inpX.className = "kt-input";
    inpX.type = "number";
    inpX.step = "any";
    inpX.placeholder = "X";

    const lblY = document.createElement("label");
    lblY.textContent = "Y:";
    Object.assign(lblY.style, { fontSize: "11px", color: "#555" });

    const inpY = document.createElement("input");
    inpY.id = "kt-inp-y";
    inpY.className = "kt-input";
    inpY.type = "number";
    inpY.step = "any";
    inpY.placeholder = "Y";

    const lblW = document.createElement("label");
    lblW.textContent = "Rộng:";
    Object.assign(lblW.style, { fontSize: "11px", color: "#555" });

    const inpW = document.createElement("input");
    inpW.id = "kt-inp-w";
    inpW.className = "kt-input";
    inpW.type = "number";
    inpW.step = "any";
    inpW.min = "0.1";
    inpW.placeholder = "Width";

    const lblH = document.createElement("label");
    lblH.textContent = "Cao:";
    Object.assign(lblH.style, { fontSize: "11px", color: "#555" });

    const inpH = document.createElement("input");
    inpH.id = "kt-inp-h";
    inpH.className = "kt-input";
    inpH.type = "number";
    inpH.step = "any";
    inpH.min = "0.1";
    inpH.placeholder = "Height";

    const btnStart = document.createElement("button");
    btnStart.id = "kt-btn-start";
    btnStart.textContent = "🎯 Bắt đầu lấy";
    btnStart.disabled = true;

    const btnCancelCapture = document.createElement("button");
    btnCancelCapture.id = "kt-btn-cancel-capture";
    btnCancelCapture.textContent = "✖ Huỷ chụp";
    btnCancelCapture.title = "Dừng chế độ chụp";

    function handleCancelCapture(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      stopCaptureMode();
      setPanelHidden(false);
    }

    btnCancelCapture.addEventListener("mousedown", handleCancelCapture, true);
    btnCancelCapture.addEventListener("click", handleCancelCapture, true);

    inputRow.appendChild(lblX);
    inputRow.appendChild(inpX);
    inputRow.appendChild(lblY);
    inputRow.appendChild(inpY);
    inputRow.appendChild(lblW);
    inputRow.appendChild(inpW);
    inputRow.appendChild(lblH);
    inputRow.appendChild(inpH);
    inputRow.appendChild(btnStart);
    inputRow.appendChild(btnCancelCapture);
    container.appendChild(inputRow);

    // ── BACKDROP TOÀN MÀN HÌNH (Đè lên tất cả iframe, canvas, video để bắt chuột) ──
    const backdrop = document.createElement("div");
    backdrop.id = "kt-capture-backdrop";
    document.body.appendChild(backdrop);

    // ── OVERLAY ──
    const overlay = document.createElement("div");
    overlay.id = "kt-overlay";
    document.body.appendChild(overlay);

    // ── POPUP ──
    const popup = document.createElement("div");
    popup.id = "kt-popup";

    const popupTitle = document.createElement("h4");
    popupTitle.textContent = "📷 Đặt tên cho ảnh chụp";
    popup.appendChild(popupTitle);

    const popupInput = document.createElement("input");
    popupInput.id = "kt-popup-input";
    popupInput.type = "text";
    popupInput.placeholder = "Vd: anhconvoi";
    popupInput.autocomplete = "off";
    popup.appendChild(popupInput);

    const popupBtns = document.createElement("div");
    popupBtns.className = "kt-popup-btns";

    const btnCancel = document.createElement("button");
    btnCancel.id = "kt-popup-cancel";
    btnCancel.textContent = "Huỷ";

    const btnOk = document.createElement("button");
    btnOk.id = "kt-popup-ok";
    btnOk.textContent = "✔ OK";

    popupBtns.appendChild(btnCancel);
    popupBtns.appendChild(btnOk);
    popup.appendChild(popupBtns);
    document.body.appendChild(popup);

    // ── POPUP CHỈNH SỬA THÔNG SỐ (EDIT POPUP) ──
    let currentEditIndex = -1;
    const editPopup = document.createElement("div");
    editPopup.id = "kt-edit-popup";
    Object.assign(editPopup.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%,-50%)",
      background: "#fff",
      border: "2px solid #1e3a5f",
      borderRadius: "8px",
      padding: "16px 20px",
      zIndex: 2147483647,
      minWidth: "320px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
      fontFamily: "monospace",
      fontSize: "12px",
      display: "none",
    });

    const editTitle = document.createElement("h4");
    editTitle.textContent = "✏️ Chỉnh sửa thông số";
    Object.assign(editTitle.style, { margin: "0 0 12px", color: "#1e3a5f", fontSize: "13px" });
    editPopup.appendChild(editTitle);

    const formGrid = document.createElement("div");
    Object.assign(formGrid.style, {
      display: "grid",
      gridTemplateColumns: "70px 1fr",
      gap: "8px 10px",
      alignItems: "center",
      marginBottom: "14px"
    });

    // Name
    const lblEditName = document.createElement("label");
    lblEditName.textContent = "Tên:";
    lblEditName.style.fontWeight = "bold";
    const editInpName = document.createElement("input");
    editInpName.type = "text";
    Object.assign(editInpName.style, { padding: "4px 8px", border: "1px solid #999", borderRadius: "4px", fontSize: "12px", outline: "none" });

    // X
    const lblEditX = document.createElement("label");
    lblEditX.textContent = "Toạ độ X:";
    lblEditX.style.fontWeight = "bold";
    const editInpX = document.createElement("input");
    editInpX.type = "number";
    editInpX.step = "any";
    Object.assign(editInpX.style, { padding: "4px 8px", border: "1px solid #999", borderRadius: "4px", fontSize: "12px", outline: "none" });

    // Y
    const lblEditY = document.createElement("label");
    lblEditY.textContent = "Toạ độ Y:";
    lblEditY.style.fontWeight = "bold";
    const editInpY = document.createElement("input");
    editInpY.type = "number";
    editInpY.step = "any";
    Object.assign(editInpY.style, { padding: "4px 8px", border: "1px solid #999", borderRadius: "4px", fontSize: "12px", outline: "none" });

    // Width
    const lblEditW = document.createElement("label");
    lblEditW.textContent = "Rộng (W):";
    lblEditW.style.fontWeight = "bold";
    const editInpW = document.createElement("input");
    editInpW.type = "number";
    editInpW.step = "any";
    editInpW.min = "0.1";
    Object.assign(editInpW.style, { padding: "4px 8px", border: "1px solid #999", borderRadius: "4px", fontSize: "12px", outline: "none" });

    // Height
    const lblEditH = document.createElement("label");
    lblEditH.textContent = "Cao (H):";
    lblEditH.style.fontWeight = "bold";
    const editInpH = document.createElement("input");
    editInpH.type = "number";
    editInpH.step = "any";
    editInpH.min = "0.1";
    Object.assign(editInpH.style, { padding: "4px 8px", border: "1px solid #999", borderRadius: "4px", fontSize: "12px", outline: "none" });

    formGrid.appendChild(lblEditName); formGrid.appendChild(editInpName);
    formGrid.appendChild(lblEditX); formGrid.appendChild(editInpX);
    formGrid.appendChild(lblEditY); formGrid.appendChild(editInpY);
    formGrid.appendChild(lblEditW); formGrid.appendChild(editInpW);
    formGrid.appendChild(lblEditH); formGrid.appendChild(editInpH);
    editPopup.appendChild(formGrid);

    const editBtns = document.createElement("div");
    Object.assign(editBtns.style, { display: "flex", gap: "8px", justifyContent: "flex-end" });

    const btnEditCancel = document.createElement("button");
    btnEditCancel.textContent = "Huỷ";
    Object.assign(btnEditCancel.style, { padding: "4px 12px", background: "#e5e7eb", color: "#333", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" });

    const btnEditSave = document.createElement("button");
    btnEditSave.textContent = "✔ Lưu";
    Object.assign(btnEditSave.style, { padding: "4px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" });

    editBtns.appendChild(btnEditCancel);
    editBtns.appendChild(btnEditSave);
    editPopup.appendChild(editBtns);
    document.body.appendChild(editPopup);

    function openEditPopup(idx, item) {
      currentEditIndex = idx;
      editInpName.value = item.name;
      editInpX.value = item.x;
      editInpY.value = item.y;
      editInpW.value = item.width;
      editInpH.value = item.height;

      editInpName.style.border = "1px solid #999";
      editInpW.style.border = "1px solid #999";
      editInpH.style.border = "1px solid #999";

      editPopup.style.display = "block";
      setTimeout(function () { editInpName.focus(); }, 50);
    }

    function closeEditPopup() {
      editPopup.style.display = "none";
      currentEditIndex = -1;
    }

    btnEditCancel.onclick = closeEditPopup;

    async function saveEditPopup() {
      if (currentEditIndex < 0 || currentEditIndex >= captureList.length) return;
      var newName = editInpName.value.trim();
      var newX = parseFloat(editInpX.value);
      var newY = parseFloat(editInpY.value);
      var newW = parseFloat(editInpW.value);
      var newH = parseFloat(editInpH.value);

      if (!newName) {
        editInpName.style.border = "1px solid red";
        return;
      }
      if (isNaN(newW) || newW <= 0) {
        editInpW.style.border = "1px solid red";
        return;
      }
      if (isNaN(newH) || newH <= 0) {
        editInpH.style.border = "1px solid red";
        return;
      }

      var oldItem = captureList[currentEditIndex];
      // Nếu đổi tên và checker đang chạy thì dừng
      if (oldItem && runningCheckers.has(oldItem.name) && oldItem.name !== newName) {
        await window.stopChecker(oldItem.name);
        runningCheckers.delete(oldItem.name);
      }

      var res = await window.updateCapture(currentEditIndex, {
        name: newName,
        x: isNaN(newX) ? 0 : newX,
        y: isNaN(newY) ? 0 : newY,
        width: newW,
        height: newH
      });

      if (res && res.success) {
        captureList[currentEditIndex] = res.item;
        renderTable();
        closeEditPopup();
      } else {
        alert("Lỗi cập nhật: " + (res ? res.error : "unknown"));
      }
    }

    btnEditSave.onclick = saveEditPopup;

    editPopup.addEventListener("keydown", function (e) {
      if (e.key === "Enter") saveEditPopup();
      if (e.key === "Escape") closeEditPopup();
    });

    // ── TOGGLE BUTTON ──
    const toggleBtn = document.createElement("div");
    toggleBtn.textContent = "▲";
    Object.assign(toggleBtn.style, {
      position: "fixed", top: "10px", right: "5px",
      padding: "3px 7px", background: "#fff", border: "1px solid #999",
      borderRadius: "4px", cursor: "pointer", zIndex: 2147483647,
    });

    function setPanelHidden(hidden) {
      isHidden = hidden;
      container.style.display = isHidden ? "none" : "block";
      toggleBtn.textContent = isHidden ? "▲" : "▼";
    }

    toggleBtn.onclick = () => {
      setPanelHidden(!isHidden);
    };

    // ── NÚT HUỶ CHỤP NỔI (hiển thị khi đang capture trên màn hình) ──
    const floatCancelBtn = document.createElement("button");
    floatCancelBtn.id = "kt-float-cancel";
    floatCancelBtn.textContent = "✖ Huỷ chụp";
    Object.assign(floatCancelBtn.style, {
      position: "fixed", top: "10px", right: "35px",
      padding: "3px 8px", background: "#ef4444", color: "#fff",
      border: "1px solid #dc2626", borderRadius: "4px", cursor: "pointer",
      zIndex: 2147483647, display: "none", fontSize: "11px", fontWeight: "bold",
      boxShadow: "0 2px 6px rgba(0,0,0,0.25)"
    });
    floatCancelBtn.addEventListener("mousedown", handleCancelCapture, true);
    floatCancelBtn.addEventListener("click", handleCancelCapture, true);

    document.body.appendChild(floatCancelBtn);
    document.body.appendChild(toggleBtn);
    document.body.appendChild(container);

    // ══════════════════════════════════════
    //  RENDER TABLE
    // ══════════════════════════════════════
    function renderTable() {
      const tbody = document.getElementById("kt-tbody");
      if (!tbody) return;
      tbody.innerHTML = "";

      if (captureList.length === 0) {
        emptyMsg.style.display = "block";
        return;
      }
      emptyMsg.style.display = "none";

      captureList.forEach(function (item, idx) {
        const tr = document.createElement("tr");

        const tdImg = document.createElement("td");
        tdImg.style.width = "64px";
        tdImg.style.padding = "2px 4px";
        if (item.imgBase64) {
          const img = document.createElement("img");
          img.src = item.imgBase64;
          img.style.maxWidth = "64px";
          img.style.maxHeight = "39px";
          img.style.borderRadius = "2px";
          img.style.display = "block";
          img.style.margin = "0 auto";
          img.style.border = "1px solid #ccc";
          img.style.background = "#fff";
          img.title = item.name;
          tdImg.appendChild(img);
        } else {
          tdImg.textContent = "-";
        }

        const tdName = document.createElement("td");
        tdName.title = item.name;
        tdName.textContent = item.name;

        const tdX = document.createElement("td");
        tdX.textContent = item.x;

        const tdY = document.createElement("td");
        tdY.textContent = item.y;

        const tdW = document.createElement("td");
        tdW.textContent = item.width;

        const tdH = document.createElement("td");
        tdH.textContent = item.height;

        const tdAct = document.createElement("td");

        const bDel = document.createElement("button");
        bDel.className = "btn-del";
        bDel.textContent = "Xoá";
        bDel.onclick = async function () {
          // Dừng checker nếu đang chạy
          if (runningCheckers.has(item.name)) {
            await window.stopChecker(item.name);
            runningCheckers.delete(item.name);
          }
          const res = await window.deleteCapture(idx);
          if (res && res.success) {
            captureList.splice(idx, 1);
            renderTable();
          }
        };

        const bEdit = document.createElement("button");
        bEdit.className = "btn-edit";
        bEdit.textContent = "Sửa";
        bEdit.title = "Chỉnh sửa thông số";
        bEdit.onclick = function () {
          openEditPopup(idx, item);
        };

        const bCopy = document.createElement("button");
        bCopy.className = "btn-copy";
        bCopy.textContent = "Copy";
        bCopy.title = "Tạo 1 bản sao ngay phía dưới";
        bCopy.onclick = async function () {
          const res = await window.copyCapture(idx);
          if (res && res.success) {
            captureList.splice(res.index, 0, res.item);
            renderTable();
          } else {
            alert("Lỗi copy: " + (res ? res.error : "unknown"));
          }
        };

        const bCheck = document.createElement("button");
        bCheck.className = "btn-check";
        const isRunning = runningCheckers.has(item.name);
        bCheck.textContent = isRunning ? "⏹ Dừng" : "Check";
        if (isRunning) bCheck.style.background = "#dc2626";
        bCheck.onclick = async function () {
          if (!runningCheckers.has(item.name)) {
            // Bắt đầu check
            const res = await window.startChecker(item);
            if (res && res.success) {
              runningCheckers.add(item.name);
              bCheck.textContent = "⏹ Dừng";
              bCheck.style.background = "#dc2626";
            }
          } else {
            // Dừng check
            await window.stopChecker(item.name);
            runningCheckers.delete(item.name);
            bCheck.textContent = "Check";
            bCheck.style.background = "";
          }
        };

        tdAct.appendChild(bDel);
        tdAct.appendChild(bEdit);
        tdAct.appendChild(bCopy);
        tdAct.appendChild(bCheck);

        tr.appendChild(tdImg);
        tr.appendChild(tdName);
        tr.appendChild(tdX);
        tr.appendChild(tdY);
        tr.appendChild(tdW);
        tr.appendChild(tdH);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
    }

    renderTable();

    // ══════════════════════════════════════
    //  VALIDATION W/H → enable button
    // ══════════════════════════════════════
    function validateInputs() {
      var w = parseFloat(inpW.value);
      var h = parseFloat(inpH.value);
      var valid = !isNaN(w) && w > 0 && !isNaN(h) && h > 0;
      btnStart.disabled = !valid;
      if (valid) {
        btnStart.classList.add("active");
      } else {
        btnStart.classList.remove("active");
      }
    }

    inpX.addEventListener("input", validateInputs);
    inpY.addEventListener("input", validateInputs);
    inpW.addEventListener("input", validateInputs);
    inpH.addEventListener("input", validateInputs);

    // ══════════════════════════════════════
    //  CAPTURE MODE
    // ══════════════════════════════════════
    function stopCaptureMode() {
      isCapturing = false;
      if (typeof backdrop !== "undefined" && backdrop) {
        backdrop.style.display = "none";
      }
      if (typeof floatCancelBtn !== "undefined" && floatCancelBtn) {
        floatCancelBtn.style.display = "none";
      }
      overlay.style.display = "none";
      overlay.style.left = "-99999px";
      overlay.style.top = "-99999px";
      document.body.style.cursor = "";
      if (mouseMoveHandler) {
        if (typeof backdrop !== "undefined" && backdrop) {
          backdrop.removeEventListener("mousemove", mouseMoveHandler, true);
        }
        window.removeEventListener("mousemove", mouseMoveHandler, true);
        document.removeEventListener("mousemove", mouseMoveHandler, true);
        mouseMoveHandler = null;
      }
      if (mouseClickHandler) {
        if (typeof backdrop !== "undefined" && backdrop) {
          backdrop.removeEventListener("mousedown", mouseClickHandler, true);
        }
        window.removeEventListener("mousedown", mouseClickHandler, true);
        document.removeEventListener("mousedown", mouseClickHandler, true);
        mouseClickHandler = null;
      }
      if (captureKeyDownHandler) {
        window.removeEventListener("keydown", captureKeyDownHandler, true);
        document.removeEventListener("keydown", captureKeyDownHandler, true);
        captureKeyDownHandler = null;
      }
    }

    function triggerCapture(x, y) {
      pendingCapture = { x: x, y: y };
      stopCaptureMode();

      // Hiện popup
      popupInput.value = "";
      popupInput.style.border = "";
      popup.style.display = "block";
      setTimeout(function () { popupInput.focus(); }, 50);
    }

    btnStart.addEventListener("click", async function (evt) {
      if (!btnStart.classList.contains("active")) return;
      stopCaptureMode(); // Huỷ sạch chế độ capture cũ nếu có

      captureW = parseFloat(inpW.value);
      captureH = parseFloat(inpH.value);
      isCapturing = true;

      // Màn che toàn màn hình đè lên iframe/canvas/web
      if (typeof backdrop !== "undefined" && backdrop) {
        backdrop.style.display = "block";
      }

      // Hiện nút Huỷ chụp nổi trên màn hình
      if (typeof floatCancelBtn !== "undefined" && floatCancelBtn) {
        floatCancelBtn.style.display = "block";
      }

      // Tắt popup kiểm thử ảnh (ẩn panel)
      setPanelHidden(true);

      overlay.style.width = captureW + "px";
      overlay.style.height = captureH + "px";

      var valX = inpX.value.trim();
      var valY = inpY.value.trim();
      var hasCustomCoord = valX !== "" && valY !== "";

      if (hasCustomCoord) {
        var posX = parseFloat(valX);
        var posY = parseFloat(valY);
        currentCapturePos = { x: posX, y: posY };
        overlay.style.left = posX + "px";
        overlay.style.top = posY + "px";
        overlay.style.display = "block";

        if (typeof window.moveMouse === "function") {
          try {
            await window.moveMouse(Math.round(posX), Math.round(posY));
          } catch (_) { }
        }
      } else {
        var initX = evt && typeof evt.clientX === "number" ? evt.clientX : 100;
        var initY = evt && typeof evt.clientY === "number" ? evt.clientY : 100;
        currentCapturePos = { x: initX, y: initY };
        overlay.style.left = initX + "px";
        overlay.style.top = initY + "px";
        overlay.style.display = "block";
      }

      document.body.style.cursor = "crosshair";

      mouseMoveHandler = function (e) {
        if (!isCapturing) {
          overlay.style.display = "none";
          return;
        }
        // Nếu có nhập X và Y thì cố định khung đỏ tại đó, không đi theo chuột
        if (hasCustomCoord) {
          return;
        }
        currentCapturePos = { x: e.clientX, y: e.clientY };
        overlay.style.left = e.clientX + "px";
        overlay.style.top = e.clientY + "px";
        overlay.style.display = "block";
      };
      if (typeof backdrop !== "undefined" && backdrop) {
        backdrop.addEventListener("mousemove", mouseMoveHandler, true);
      }
      window.addEventListener("mousemove", mouseMoveHandler, true);

      mouseClickHandler = function (e) {
        if (e.button !== 0) return;
        // Bỏ qua click vào UI panel, nút toggle, nút huỷ chụp nổi, popup đặt tên và popup edit
        if (container.contains(e.target) || popup.contains(e.target) || (typeof editPopup !== "undefined" && editPopup.contains(e.target)) || toggleBtn.contains(e.target) || floatCancelBtn.contains(e.target)) return;
        e.preventDefault();
        e.stopPropagation();

        //  triggerCapture(e.clientX, e.clientY); theo chuột 
        // Nếu có nhập X và Y thì chụp đúng toạ độ cố định đã nhập, không phụ thuộc vào vị trí click chuột
        var targetX = hasCustomCoord && currentCapturePos ? currentCapturePos.x : e.clientX;
        var targetY = hasCustomCoord && currentCapturePos ? currentCapturePos.y : e.clientY;
        triggerCapture(targetX, targetY);
      };
      if (typeof backdrop !== "undefined" && backdrop) {
        backdrop.addEventListener("mousedown", mouseClickHandler, true);
      }
      window.addEventListener("mousedown", mouseClickHandler, true);

      captureKeyDownHandler = function (e) {
        if (!isCapturing) return;
        if (e.key === "Escape") {
          stopCaptureMode();
          setPanelHidden(false);
          return;
        }
        if (e.key === "p" || e.key === "P") {
          if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
          if (currentCapturePos) {
            e.preventDefault();
            e.stopPropagation();
            triggerCapture(currentCapturePos.x, currentCapturePos.y);
          }
        }
      };
      window.addEventListener("keydown", captureKeyDownHandler, true);
    });

    // ══════════════════════════════════════
    //  POPUP OK / Huỷ
    // ══════════════════════════════════════
    btnCancel.addEventListener("click", function () {
      popup.style.display = "none";
      pendingCapture = null;
      setPanelHidden(false);
    });

    async function confirmCapture() {
      var name = popupInput.value.trim();
      if (!name) {
        popupInput.style.border = "1px solid red";
        return;
      }
      popupInput.style.border = "";
      popup.style.display = "none";

      var cx = pendingCapture.x;
      var cy = pendingCapture.y;
      pendingCapture = null;

      var res = await window.doCapture({ name: name, x: cx, y: cy, width: captureW, height: captureH });
      if (res && res.success) {
        captureList.push(res.item);
        renderTable();
        setPanelHidden(false);
      } else {
        alert("Lỗi chụp: " + (res ? res.error : "unknown"));
        setPanelHidden(false);
      }
    }

    btnOk.addEventListener("click", confirmCapture);

    popupInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") confirmCapture();
      if (e.key === "Escape") { popup.style.display = "none"; pendingCapture = null; setPanelHidden(false); }
    });

    // ESC thoát capture mode
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isCapturing) {
        stopCaptureMode();
        setPanelHidden(false);
      }
    });

  }, existingItems);
}

module.exports = {
  UI_TableKiemthu
};
