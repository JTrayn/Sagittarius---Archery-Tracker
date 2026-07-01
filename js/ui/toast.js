(function () {
  const App = window.ArcheryApp;
  let region;
  const activeToasts = new Map();
  const toastTimers = new WeakMap();
  const MAX_TOASTS = 3;

  function init() {
    region = document.getElementById("toastRegion");
  }

  function show(message, type = "") {
    if (!region) return;
    const key = `${type}::${message}`;
    const existing = activeToasts.get(key);
    if (existing) {
      restartToast(existing, key);
      return;
    }

    while (region.children.length >= MAX_TOASTS) {
      removeToast(region.firstElementChild);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`.trim();
    toast.textContent = message;
    toast.dataset.toastKey = key;
    region.appendChild(toast);
    activeToasts.set(key, toast);
    scheduleRemoval(toast, key);
  }

  function restartToast(toast, key) {
    const oldTimer = toastTimers.get(toast);
    if (oldTimer) window.clearTimeout(oldTimer);
    toast.classList.remove("toast-pulse");
    // Restart the pulse animation when repeated actions trigger the same toast.
    void toast.offsetWidth;
    toast.classList.add("toast-pulse");
    scheduleRemoval(toast, key);
  }

  function scheduleRemoval(toast, key) {
    const timer = window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      toast.style.transition = "opacity 180ms ease, transform 180ms ease";
      window.setTimeout(() => {
        activeToasts.delete(key);
        removeToast(toast);
      }, 220);
    }, 2200);
    toastTimers.set(toast, timer);
  }

  function removeToast(toast) {
    if (!toast) return;
    const key = toast.dataset ? toast.dataset.toastKey : null;
    const timer = toastTimers.get(toast);
    if (timer) window.clearTimeout(timer);
    if (key) activeToasts.delete(key);
    toast.remove();
  }

  App.Toast = { init, show };
})();
