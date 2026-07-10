(function () {
  const App = window.ArcheryApp;

  let options = {};
  let modalBody = null;
  let draft = null;
  let dragZoneIndex = null;

  function open(nextOptions = {}) {
    options = nextOptions;
    App.Modal.open("Target Faces", renderLibrary(), body => {
      modalBody = body;
      bindLibrary();
    });
  }

  function renderLibrary() {
    const builtIns = App.TargetFaces.listBuiltInTargetFaces();
    const customFaces = App.TargetFaces.listCustomTargetFaces();
    const sourceFace = App.TargetFaces.getTargetFace(options.sourceFaceId || App.Constants.DEFAULT_TARGET_FACE_ID);

    return `
      <div class="target-face-manager">
        <div class="target-face-manager-actions">
          <button class="btn btn-primary" type="button" data-face-action="duplicate-current">Duplicate current face</button>
          <button class="btn" type="button" data-face-action="new">New custom face</button>
        </div>
        <div class="target-face-manager-grid">
          <section class="target-face-library-section">
            <div class="target-face-section-head">
              <strong>Custom target faces</strong>
              <span>${customFaces.length} saved</span>
            </div>
            <div class="target-face-list">
              ${customFaces.length ? customFaces.map(renderCustomFaceItem).join("") : renderEmptyCustomFaces(sourceFace)}
            </div>
          </section>
          <section class="target-face-library-section">
            <div class="target-face-section-head">
              <strong>Built-in target faces</strong>
              <span>Duplicate to edit</span>
            </div>
            <div class="target-face-list">
              ${builtIns.map(renderBuiltInFaceItem).join("")}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  function renderEmptyCustomFaces(sourceFace) {
    return `
      <div class="target-face-empty">
        <strong>No custom faces yet</strong>
        <span>Duplicate ${escapeHtml(sourceFace.name)} or start a new custom target face.</span>
      </div>
    `;
  }

  function renderCustomFaceItem(face) {
    return `
      <article class="target-face-card">
        <div>
          <strong>${escapeHtml(face.name)}</strong>
          <span>${renderFaceSummary(face)}</span>
        </div>
        <div class="target-face-card-actions">
          <button class="btn btn-small" type="button" data-face-action="edit" data-face-id="${escapeHtml(face.id)}">Edit</button>
          <button class="btn btn-small" type="button" data-face-action="duplicate" data-face-id="${escapeHtml(face.id)}">Duplicate</button>
          <button class="btn btn-small danger-btn" type="button" data-face-action="delete" data-face-id="${escapeHtml(face.id)}">Delete</button>
        </div>
      </article>
    `;
  }

  function renderBuiltInFaceItem(face) {
    return `
      <article class="target-face-card">
        <div>
          <strong>${escapeHtml(face.name)}</strong>
          <span>${renderFaceSummary(face)}</span>
        </div>
        <div class="target-face-card-actions">
          <button class="btn btn-small" type="button" data-face-action="duplicate" data-face-id="${escapeHtml(face.id)}">Duplicate</button>
        </div>
      </article>
    `;
  }

  function bindLibrary() {
    modalBody.onclick = async event => {
      const button = event.target.closest("[data-face-action]");
      if (!button || !modalBody.contains(button)) return;
      const action = button.dataset.faceAction;
      const faceId = button.dataset.faceId;
      if (action === "new") {
        openEditor(makeBlankFaceDraft());
      } else if (action === "duplicate-current") {
        openEditor(makeDuplicateDraft(App.TargetFaces.getTargetFace(options.sourceFaceId || App.Constants.DEFAULT_TARGET_FACE_ID)));
      } else if (action === "duplicate") {
        openEditor(makeDuplicateDraft(App.TargetFaces.getTargetFace(faceId)));
      } else if (action === "edit") {
        openEditor(App.TargetFaces.loadCustomTargetFace(faceId));
      } else if (action === "delete") {
        await deleteCustomFace(faceId);
      }
    };
  }

  async function deleteCustomFace(faceId) {
    const face = App.TargetFaces.loadCustomTargetFace(faceId);
    if (!face) return;
    if (isTargetFaceReferenced(faceId)) {
      App.Toast.show("Target face is used by a scorecard", "danger");
      return;
    }
    const confirmed = await App.Modal.confirm({
      title: "Delete target face",
      message: `Delete ${face.name}? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger"
    });
    if (!confirmed) return;
    App.TargetFaces.deleteCustomTargetFace(faceId);
    notifyChanged();
    rerenderLibrary();
    App.Toast.show("Target face deleted", "success");
  }

  function openEditor(nextDraft) {
    draft = App.TargetFaces.normalizeCustomTargetFace(nextDraft || makeBlankFaceDraft(), { preserveId: true });
    modalBody.innerHTML = renderEditor(draft);
    bindEditor();
    updatePreview();
  }

  function renderEditor(face) {
    return `
      <form class="target-face-editor" id="targetFaceEditorForm">
        <div class="target-face-editor-main">
          <section class="target-face-editor-form">
            <div class="target-face-form-grid">
              <label>
                <span>Name</span>
                <input name="name" type="text" value="${escapeHtml(face.name)}" autocomplete="off" />
              </label>
              <label>
                <span>Short name</span>
                <input name="shortName" type="text" value="${escapeHtml(face.shortName || "")}" maxlength="18" autocomplete="off" />
              </label>
              <label>
                <span>Family</span>
                <input name="family" type="text" value="${escapeHtml(face.family || "Custom target faces")}" autocomplete="off" />
              </label>
              <label>
                <span>Derived diameter</span>
                <input name="derivedDiameterMm" type="text" value="${formatMm(getOuterDiameter(face))}" readonly />
              </label>
            </div>
            <label>
              <span>Description</span>
              <textarea name="description" rows="2" placeholder="Optional target-face notes...">${escapeHtml(face.description || "")}</textarea>
            </label>
            ${renderLabelControls(face)}
          </section>
          <aside class="target-face-preview-panel">
            <strong>Preview</strong>
            <canvas class="target-face-preview" width="360" height="360"></canvas>
          </aside>
        </div>
        <div class="target-face-zone-head">
          <strong>Scoring zones</strong>
          <button class="btn btn-small" type="button" data-editor-action="add-zone">Add zone</button>
        </div>
        <div class="target-face-zone-table">
          <div class="target-face-zone-row target-face-zone-row-head">
            <span></span>
            <span>Label</span>
            <span>Size</span>
            <span>Pos.</span>
            <span>Depth</span>
            <span>Colour</span>
            <span>Score</span>
            <span>Diameter</span>
            <span>Fill</span>
            <span>Line</span>
            <span>Width</span>
            <span></span>
          </div>
          <div class="target-face-zone-rows">
            ${face.zones.map(renderZoneRow).join("")}
          </div>
        </div>
        <div class="target-face-validation" data-validation></div>
        <div class="form-actions">
          <button class="btn" type="button" data-editor-action="back">Back</button>
          <button class="btn btn-primary" type="submit">Save Target Face</button>
        </div>
      </form>
    `;
  }

  function renderLabelControls(face) {
    const settings = normalizeLabelSettings(face?.labels || {});
    return `
      <section class="target-face-label-panel">
        <div class="target-face-section-head">
          <strong>Target labels</strong>
          <span>Shared angle and ring depth</span>
        </div>
        <div class="target-face-label-grid">
          <label>
            <span>Angle</span>
            <select name="labelPosition">
              ${renderSharedLabelPositionOptions(settings.position)}
            </select>
          </label>
          <label>
            <span>Depth</span>
            <select name="labelDepth">
              ${renderSharedLabelDepthOptions(settings.depth)}
            </select>
          </label>
          <label class="target-face-label-auto">
            <input name="labelAutoColour" type="checkbox" ${settings.autoContrast ? "checked" : ""} />
            <span>Auto contrast</span>
          </label>
        </div>
      </section>
    `;
  }

  function renderZoneRow(zone, index) {
    return `
      <div class="target-face-zone-row" data-zone-row data-zone-id="${escapeHtml(zone.id)}" data-zone-index="${index}">
        <button class="icon-btn target-face-zone-drag" type="button" draggable="true" data-zone-drag aria-label="Drag zone ${index + 1}">::</button>
        <input name="label" type="text" value="${escapeHtml(zone.label)}" aria-label="Zone label" />
        <select name="labelSize" data-custom-native aria-label="Zone label size">
          ${renderLabelSizeOptions(zone.labelSize || "medium")}
        </select>
        <select name="labelPosition" data-custom-native aria-label="Zone label position">
          ${renderZoneLabelPositionOptions(zone.labelPosition || "")}
        </select>
        <select name="labelDepth" data-custom-native aria-label="Zone label depth">
          ${renderZoneLabelDepthOptions(zone.labelDepth || "")}
        </select>
        <input name="labelFill" type="color" value="${escapeHtml(zone.labelFill || "#121820")}" aria-label="Zone label colour" ${draft?.labels?.autoContrast !== false ? "disabled" : ""} />
        <input name="score" type="number" step="1" value="${zone.score}" aria-label="Zone score" />
        <input name="diameterMm" type="number" min="0.1" step="0.1" value="${roundMm(zone.radiusMm * 2)}" aria-label="Zone diameter" />
        <input name="fill" type="color" value="${escapeHtml(zone.fill)}" aria-label="Zone fill colour" />
        <input name="stroke" type="color" value="${escapeHtml(zone.stroke)}" aria-label="Zone border colour" />
        <input name="strokeWidthMm" type="number" min="0" step="0.1" value="${zone.strokeWidthMm}" aria-label="Zone border width" />
        <button class="icon-btn target-face-zone-remove" type="button" data-editor-action="remove-zone" aria-label="Remove zone ${index + 1}">x</button>
      </div>
    `;
  }

  function bindEditor() {
    const form = modalBody.querySelector("#targetFaceEditorForm");
    if (App.CustomSelect) App.CustomSelect.enhanceAll(modalBody);
    const updateDraftAndPreview = () => {
      draft = readEditorDraft();
      updatePreview();
    };
    form.addEventListener("input", updateDraftAndPreview);
    form.addEventListener("change", updateDraftAndPreview);
    form.addEventListener("submit", event => {
      event.preventDefault();
      saveEditor();
    });
    form.querySelectorAll("[data-editor-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.editorAction;
        if (action === "back") {
          rerenderLibrary();
        } else if (action === "add-zone") {
          addZone();
        } else if (action === "remove-zone") {
          removeZone(button);
        }
      });
    });
    bindZoneDragging();
  }

  function bindZoneDragging() {
    modalBody.querySelectorAll("[data-zone-row]").forEach((row, index) => {
      const handle = row.querySelector("[data-zone-drag]");
      if (!handle) return;

      handle.addEventListener("dragstart", event => {
        draft = readEditorDraft();
        dragZoneIndex = index;
        row.classList.add("is-dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", String(index));
        }
      });

      handle.addEventListener("dragend", () => {
        dragZoneIndex = null;
        modalBody.querySelectorAll("[data-zone-row]").forEach(item => {
          item.classList.remove("is-dragging", "is-drop-target");
        });
      });

      row.addEventListener("dragover", event => {
        if (dragZoneIndex === null || dragZoneIndex === index) return;
        event.preventDefault();
        row.classList.add("is-drop-target");
      });

      row.addEventListener("dragleave", () => {
        row.classList.remove("is-drop-target");
      });

      row.addEventListener("drop", event => {
        event.preventDefault();
        row.classList.remove("is-drop-target");
        moveZone(dragZoneIndex, index);
      });
    });
  }

  function moveZone(fromIndex, toIndex) {
    if (fromIndex === null || fromIndex === toIndex) return;
    draft = readEditorDraft();
    const zones = draft.zones.slice();
    const moved = zones.splice(fromIndex, 1)[0];
    if (!moved) return;
    zones.splice(toIndex, 0, moved);
    draft.zones = zones;
    dragZoneIndex = null;
    openEditor(draft);
  }

  function readEditorDraft() {
    const form = modalBody.querySelector("#targetFaceEditorForm");
    const zones = Array.from(form.querySelectorAll("[data-zone-row]")).map((row, index) => ({
      id: row.dataset.zoneId || draft.zones[index]?.id,
      label: row.querySelector("input[name='label']").value.trim(),
      targetLabel: getPreservedTargetLabel(row, index),
      labelSize: row.querySelector("select[name='labelSize']").value,
      labelPosition: row.querySelector("select[name='labelPosition']").value,
      labelDepth: row.querySelector("select[name='labelDepth']").value,
      labelFill: row.querySelector("input[name='labelFill']").value,
      score: Number(row.querySelector("input[name='score']").value),
      radiusMm: Number(row.querySelector("input[name='diameterMm']").value) / 2,
      fill: row.querySelector("input[name='fill']").value,
      stroke: row.querySelector("input[name='stroke']").value,
      strokeWidthMm: Number(row.querySelector("input[name='strokeWidthMm']").value)
    }));

    return {
      ...draft,
      name: form.querySelector("input[name='name']").value.trim(),
      shortName: form.querySelector("input[name='shortName']").value.trim(),
      family: form.querySelector("input[name='family']").value.trim(),
      description: form.querySelector("textarea[name='description']").value.trim(),
      labels: {
        position: form.querySelector("select[name='labelPosition']").value,
        depth: form.querySelector("select[name='labelDepth']").value,
        autoContrast: form.querySelector("input[name='labelAutoColour']").checked
      },
      zones
    };
  }

  function getPreservedTargetLabel(row, index) {
    const nextLabel = row.querySelector("input[name='label']")?.value.trim() || "";
    const original = draft?.zones?.[index] || {};
    const originalLabel = String(original.label || "").trim();
    const targetLabel = String(original.targetLabel || "").trim();
    return targetLabel && nextLabel === originalLabel ? targetLabel : "";
  }

  function saveEditor() {
    draft = readEditorDraft();
    const errors = App.TargetFaces.validateTargetFaceDraft(draft);
    renderValidation(errors);
    if (errors.length) return;

    const saved = App.TargetFaces.saveCustomTargetFace(draft);
    draft = saved;
    notifyChanged();
    App.Toast.show("Target face saved", "success");
    rerenderLibrary();
  }

  function addZone() {
    draft = readEditorDraft();
    const outerRadius = draft.zones.length
      ? Math.max(...draft.zones.map(zone => Number(zone.radiusMm) || 0))
      : 40;
    draft.zones.push({
      id: App.Ids.makeId("zone"),
      label: String(Math.max(1, 10 - draft.zones.length)),
      score: Math.max(1, 10 - draft.zones.length),
      radiusMm: Math.max(outerRadius + 20, 20),
      fill: "#f6f1de",
      stroke: "#1f1f1f",
      strokeWidthMm: 0.8
    });
    openEditor(draft);
  }

  function removeZone(button) {
    draft = readEditorDraft();
    const rows = Array.from(modalBody.querySelectorAll("[data-zone-row]"));
    const index = rows.indexOf(button.closest("[data-zone-row]"));
    if (index >= 0) draft.zones.splice(index, 1);
    openEditor(draft);
  }

  function updatePreview() {
    const canvas = modalBody.querySelector(".target-face-preview");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = { width: canvas.width, height: canvas.height, left: 0, top: 0 };
    canvas.__archeryExportRect = rect;
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "rgba(3, 10, 17, 0.72)";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const previewFace = App.TargetFaces.normalizeCustomTargetFace(draft || readEditorDraft(), { preserveId: true });
    updateDerivedDiameterField(previewFace);
    updateLabelColourInputs(previewFace.labels.autoContrast);
    const scale = Math.min(rect.width, rect.height) * 0.78 / previewFace.diameterMm;
    const transform = {
      currentPxPerMm: scale,
      targetPxPerMm: scale,
      currentPanX: 0,
      currentPanY: 0,
      targetPanX: 0,
      targetPanY: 0
    };
    App.TargetRenderer.drawTarget(ctx, canvas, transform, previewFace);
    delete canvas.__archeryExportRect;
  }

  function renderValidation(errors) {
    const node = modalBody.querySelector("[data-validation]");
    if (!node) return;
    node.innerHTML = errors.length
      ? `<strong>Check target face</strong>${errors.map(error => `<span>${escapeHtml(error)}</span>`).join("")}`
      : "";
  }

  function updateDerivedDiameterField(face) {
    const input = modalBody.querySelector("input[name='derivedDiameterMm']");
    if (input) input.value = formatMm(face.diameterMm);
  }

  function updateLabelColourInputs(autoContrast) {
    modalBody.querySelectorAll("input[name='labelFill']").forEach(input => {
      input.disabled = Boolean(autoContrast);
    });
  }

  function rerenderLibrary() {
    modalBody.innerHTML = renderLibrary();
    bindLibrary();
  }

  function notifyChanged() {
    if (typeof options.onChange === "function") options.onChange();
  }

  function renderFaceSummary(face) {
    const parts = [
      escapeHtml(face.family || (face.isBuiltIn ? "Built-in" : "Custom target faces")),
      formatMm(face.diameterMm)
    ];
    return parts.join(" &middot; ");
  }

  function makeDuplicateDraft(face) {
    const clone = App.Storage.structuredCloneSafe(face);
    delete clone.id;
    clone.name = `${face.name} Copy`;
    clone.shortName = `${face.shortName || "Custom"} Copy`.slice(0, 18);
    clone.labels = {
      position: face.labels?.position || "horizontal",
      depth: face.labels?.depth || "middle",
      autoContrast: face.labels?.autoContrast !== false
    };
    clone.family = "Custom target faces";
    clone.isBuiltIn = false;
    clone.isCustom = true;
    return App.TargetFaces.normalizeCustomTargetFace(clone, { preserveId: false });
  }

  function makeBlankFaceDraft() {
    return App.TargetFaces.normalizeCustomTargetFace({
      name: "Custom Target Face",
      shortName: "Custom",
      family: "Custom target faces",
      labels: {
        position: "horizontal",
        depth: "middle",
        autoContrast: true
      },
      zones: [
        { label: "10", score: 10, radiusMm: 20, fill: "#f7d84a", stroke: "#1f1f1f", strokeWidthMm: 0.8 },
        { label: "9", score: 9, radiusMm: 40, fill: "#f7d84a", stroke: "#1f1f1f", strokeWidthMm: 0.8 },
        { label: "8", score: 8, radiusMm: 60, fill: "#e44242", stroke: "#1f1f1f", strokeWidthMm: 0.8 },
        { label: "7", score: 7, radiusMm: 80, fill: "#e44242", stroke: "#1f1f1f", strokeWidthMm: 0.8 },
        { label: "6", score: 6, radiusMm: 100, fill: "#2684d9", stroke: "#111111", strokeWidthMm: 0.8 },
        { label: "5", score: 5, radiusMm: 120, fill: "#2684d9", stroke: "#111111", strokeWidthMm: 0.8 },
        { label: "4", score: 4, radiusMm: 140, fill: "#20252b", stroke: "#d8dde3", strokeWidthMm: 0.8 },
        { label: "3", score: 3, radiusMm: 160, fill: "#20252b", stroke: "#d8dde3", strokeWidthMm: 0.8 },
        { label: "2", score: 2, radiusMm: 180, fill: "#f6f1de", stroke: "#1f1f1f", strokeWidthMm: 0.8 },
        { label: "1", score: 1, radiusMm: 200, fill: "#f6f1de", stroke: "#1f1f1f", strokeWidthMm: 0.8 }
      ]
    }, { preserveId: false });
  }

  function isTargetFaceReferenced(faceId) {
    const current = App.State.getState().scorecard;
    if (current && (current.originalTargetFaceId || current.activeViewTargetFaceId) === faceId) return true;
    return App.Storage.listScorecards().some(item =>
      item.targetFaceId === faceId || item.originalTargetFaceId === faceId
    );
  }

  function formatMm(value) {
    if (!Number.isFinite(Number(value))) return "-";
    return `${Math.round(Number(value) * 10) / 10}mm`;
  }

  function getOuterDiameter(face) {
    const zones = Array.isArray(face?.zones) ? face.zones : [];
    const outerRadius = zones.reduce((max, zone) => Math.max(max, Number(zone.radiusMm) || 0), 0);
    return outerRadius * 2;
  }

  function normalizeLabelSettings(labels) {
    const source = labels || {};
    return {
      position: normalizeSharedLabelPosition(source.position) || "horizontal",
      depth: normalizeLabelDepth(source.depth) || "middle",
      autoContrast: source.autoContrast !== undefined ? source.autoContrast !== false : source.fill === "auto" || !source.fill
    };
  }

  function renderSharedLabelPositionOptions(selectedValue) {
    return [
      ["vertical", "Vertical up"],
      ["diagonal", "Diagonal top right"],
      ["horizontal", "Horizontal right"],
      ["diagonal-down-right", "Diagonal bottom right"],
      ["vertical-down", "Vertical down"],
      ["diagonal-down-left", "Diagonal bottom left"],
      ["horizontal-left", "Horizontal left"],
      ["diagonal-left", "Diagonal top left"]
    ].map(([value, label]) => renderOption(value, label, selectedValue)).join("");
  }

  function renderSharedLabelDepthOptions(selectedValue) {
    return [
      ["inner", "Near inner edge"],
      ["middle", "Middle of zone"],
      ["outer", "Near outer edge"]
    ].map(([value, label]) => renderOption(value, label, selectedValue)).join("");
  }

  function renderZoneLabelDepthOptions(selectedValue) {
    return [
      ["", "Shared"],
      ["inner", "Near inner"],
      ["middle", "Middle"],
      ["outer", "Near outer"]
    ].map(([value, label]) => renderOption(value, label, selectedValue)).join("");
  }

  function renderZoneLabelPositionOptions(selectedValue) {
    return [
      ["", "Shared"],
      ["center", "Center"],
      ["vertical", "Vertical up"],
      ["diagonal", "Diagonal top right"],
      ["horizontal", "Horizontal right"],
      ["diagonal-down-right", "Diagonal bottom right"],
      ["vertical-down", "Vertical down"],
      ["diagonal-down-left", "Diagonal bottom left"],
      ["horizontal-left", "Horizontal left"],
      ["diagonal-left", "Diagonal top left"]
    ].map(([value, label]) => renderOption(value, label, selectedValue)).join("");
  }

  function renderLabelSizeOptions(selectedValue) {
    return [
      ["small", "Small"],
      ["medium", "Medium"],
      ["large", "Large"],
      ["x-large", "XL"],
      ["xx-large", "2XL"],
      ["xxx-large", "3XL"],
      ["huge", "4XL"]
    ].map(([value, label]) => renderOption(value, label, selectedValue)).join("");
  }

  function normalizeSharedLabelPosition(value) {
    return [
      "diagonal",
      "vertical",
      "horizontal",
      "diagonal-left",
      "vertical-down",
      "horizontal-left",
      "diagonal-down-right",
      "diagonal-down-left"
    ].includes(value) ? value : "";
  }

  function normalizeLabelDepth(value) {
    return ["inner", "middle", "outer"].includes(value) ? value : "";
  }

  function renderOption(value, label, selectedValue) {
    return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }

  function isValidColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || "").trim());
  }

  function roundMm(value) {
    return Math.round(Number(value) * 10) / 10;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  App.TargetFaceManager = { open };
})();
