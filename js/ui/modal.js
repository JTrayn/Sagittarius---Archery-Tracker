(function () {
  const App = window.ArcheryApp;

  const els = {};
  let backdropPointerStartedOnBackdrop = false;

  function init() {
    els.backdrop = document.getElementById("modalBackdrop");
    els.title = document.getElementById("modalTitle");
    els.body = document.getElementById("modalBody");
    els.close = document.getElementById("modalCloseBtn");
    els.close.addEventListener("click", close);

    els.backdrop.addEventListener("pointerdown", event => {
      backdropPointerStartedOnBackdrop = event.target === els.backdrop;
    });

    els.backdrop.addEventListener("click", event => {
      const shouldClose = event.target === els.backdrop && backdropPointerStartedOnBackdrop;
      backdropPointerStartedOnBackdrop = false;
      if (shouldClose) close();
    });

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      if (document.querySelector(".dialog-backdrop")) return;
      if (!els.backdrop.classList.contains("hidden")) close();
    });
  }

  function open(title, bodyHtml, afterRender) {
    resetBodyNode();
    els.title.textContent = title;
    els.body.innerHTML = bodyHtml;
    els.backdrop.classList.remove("hidden");
    els.backdrop.setAttribute("aria-hidden", "false");
    if (typeof afterRender === "function") afterRender(els.body);
  }

  function close() {
    els.backdrop.classList.add("hidden");
    els.backdrop.setAttribute("aria-hidden", "true");
    resetBodyNode();
  }

  function confirm(options) {
    return openDialog({
      title: options.title || "Confirm action",
      message: options.message || "Are you sure you want to continue?",
      confirmText: options.confirmText || "Continue",
      cancelText: options.cancelText || "Cancel",
      variant: options.variant || "warning"
    });
  }

  function prompt(options) {
    return openPromptDialog({
      title: options.title || "Enter value",
      message: options.message || "",
      defaultValue: options.defaultValue || "",
      placeholder: options.placeholder || "",
      confirmText: options.confirmText || "Save",
      cancelText: options.cancelText || "Cancel"
    });
  }

  function openDialog(options) {
    return new Promise(resolve => {
      const backdrop = createDialogShell(options.title, options.message, options.variant);
      const card = backdrop.querySelector(".dialog-card");
      const actions = document.createElement("div");
      actions.className = "dialog-actions";
      actions.innerHTML = `
        <button class="btn" type="button" data-dialog-cancel>${escapeHtml(options.cancelText)}</button>
        <button class="btn ${options.variant === "danger" ? "danger-solid-btn" : "btn-primary"}" type="button" data-dialog-confirm>${escapeHtml(options.confirmText)}</button>
      `;
      card.appendChild(actions);

      bindDialogClose(backdrop, result => resolve(Boolean(result)), false);
      actions.querySelector("[data-dialog-cancel]").addEventListener("click", () => closeDialog(backdrop, false));
      actions.querySelector("[data-dialog-confirm]").addEventListener("click", () => closeDialog(backdrop, true));

      document.body.appendChild(backdrop);
      actions.querySelector("[data-dialog-confirm]").focus();
    });
  }

  function openPromptDialog(options) {
    return new Promise(resolve => {
      const backdrop = createDialogShell(options.title, options.message, "standard");
      const card = backdrop.querySelector(".dialog-card");
      const form = document.createElement("form");
      form.className = "dialog-prompt-form";
      form.innerHTML = `
        <input class="dialog-prompt-input" name="value" type="text" value="${escapeHtml(options.defaultValue)}" placeholder="${escapeHtml(options.placeholder)}" autocomplete="off" />
        <div class="dialog-actions">
          <button class="btn" type="button" data-dialog-cancel>${escapeHtml(options.cancelText)}</button>
          <button class="btn btn-primary" type="submit">${escapeHtml(options.confirmText)}</button>
        </div>
      `;
      card.appendChild(form);

      bindDialogClose(backdrop, result => resolve(result === undefined ? null : result), null);
      form.querySelector("[data-dialog-cancel]").addEventListener("click", () => closeDialog(backdrop, null));
      form.addEventListener("submit", event => {
        event.preventDefault();
        const input = form.querySelector(".dialog-prompt-input");
        closeDialog(backdrop, input.value);
      });

      document.body.appendChild(backdrop);
      const input = form.querySelector(".dialog-prompt-input");
      input.focus();
      input.select();
    });
  }

  function createDialogShell(title, message, variant) {
    const backdrop = document.createElement("div");
    backdrop.className = `modal-backdrop dialog-backdrop ${variant || "standard"}`;
    backdrop.setAttribute("role", "presentation");
    backdrop.innerHTML = `
      <div class="modal-card dialog-card" role="dialog" aria-modal="true">
        <div class="dialog-icon" aria-hidden="true">${variant === "danger" ? "!" : "?"}</div>
        <div class="dialog-copy">
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(message)}</p>
        </div>
      </div>
    `;
    return backdrop;
  }

  function bindDialogClose(backdrop, resolve, cancelResult) {
    let dialogPointerStartedOnBackdrop = false;
    let resolved = false;

    const finish = result => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    backdrop._dialogResolve = finish;

    backdrop.addEventListener("pointerdown", event => {
      dialogPointerStartedOnBackdrop = event.target === backdrop;
    });

    backdrop.addEventListener("click", event => {
      const shouldCancel = event.target === backdrop && dialogPointerStartedOnBackdrop;
      dialogPointerStartedOnBackdrop = false;
      if (shouldCancel) closeDialog(backdrop, cancelResult);
    });

    const onKeyDown = event => {
      if (!document.body.contains(backdrop)) {
        document.removeEventListener("keydown", onKeyDown);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog(backdrop, cancelResult);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    backdrop._dialogCleanup = () => document.removeEventListener("keydown", onKeyDown);
  }

  function closeDialog(backdrop, result) {
    if (!backdrop || !document.body.contains(backdrop)) return;
    if (typeof backdrop._dialogCleanup === "function") backdrop._dialogCleanup();
    if (typeof backdrop._dialogResolve === "function") backdrop._dialogResolve(result);
    backdrop.remove();
  }

  function resetBodyNode() {
    if (!els.body) return;
    const freshBody = els.body.cloneNode(false);
    els.body.replaceWith(freshBody);
    els.body = freshBody;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  App.Modal = { init, open, close, confirm, prompt };
})();
