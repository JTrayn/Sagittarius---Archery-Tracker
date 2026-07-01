(function () {
  const App = window.ArcheryApp;
  const instances = new WeakMap();
  let activeInstance = null;
  let globalBound = false;

  function init(root = document) {
    bindGlobalEvents();
    enhanceAll(root);
  }

  function bindGlobalEvents() {
    if (globalBound) return;
    globalBound = true;

    document.addEventListener("click", event => {
      if (!activeInstance) return;
      if (activeInstance.wrapper.contains(event.target)) return;
      close(activeInstance);
    });

    document.addEventListener("keydown", event => {
      if (!activeInstance) return;
      if (event.key === "Escape") {
        close(activeInstance);
        activeInstance.trigger.focus();
      }
    });
  }

  function enhanceAll(root = document) {
    root.querySelectorAll("select:not([data-custom-native])").forEach(select => enhance(select));
  }

  function enhance(select) {
    if (!select || select.dataset.customNative !== undefined) return null;
    if (instances.has(select)) {
      refresh(select);
      return instances.get(select);
    }

    const wrapper = document.createElement("div");
    wrapper.className = "custom-select";
    wrapper.dataset.selectName = select.name || select.id || "select";

    const trigger = document.createElement("button");
    trigger.className = "custom-select-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const value = document.createElement("span");
    value.className = "custom-select-value";

    const chevron = document.createElement("span");
    chevron.className = "custom-select-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "⌄";

    const menu = document.createElement("div");
    menu.className = "custom-select-menu";
    menu.hidden = true;
    menu.setAttribute("role", "listbox");

    trigger.append(value, chevron);
    wrapper.append(trigger, menu);

    select.classList.add("native-select-hidden");
    select.insertAdjacentElement("afterend", wrapper);

    const instance = { select, wrapper, trigger, value, menu };
    instances.set(select, instance);

    trigger.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      toggle(instance);
    });

    wrapper.addEventListener("keydown", event => handleKeydown(event, instance));
    select.addEventListener("change", () => refresh(select));

    const observer = new MutationObserver(() => refresh(select));
    observer.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "label", "title"] });
    instance.observer = observer;

    refresh(select);
    return instance;
  }

  function refresh(select) {
    const instance = instances.get(select);
    if (!instance) return;
    const { wrapper, trigger, value, menu } = instance;

    wrapper.classList.toggle("is-disabled", select.disabled);
    wrapper.title = select.title || "";
    trigger.disabled = select.disabled;
    trigger.title = select.title || "";
    trigger.setAttribute("aria-disabled", String(select.disabled));

    const selectedOption = select.selectedOptions && select.selectedOptions[0]
      ? select.selectedOptions[0]
      : select.querySelector(`option[value="${cssEscape(select.value)}"]`) || select.querySelector("option");
    value.textContent = selectedOption ? selectedOption.textContent.trim() : "Select";

    menu.innerHTML = "";
    const fragment = document.createDocumentFragment();
    Array.from(select.children).forEach(child => {
      if (child.tagName === "OPTGROUP") {
        const groupLabel = document.createElement("div");
        groupLabel.className = "custom-select-group";
        groupLabel.textContent = child.label || "Group";
        fragment.appendChild(groupLabel);
        Array.from(child.children).forEach(option => appendOption(fragment, instance, option));
      } else if (child.tagName === "OPTION") {
        appendOption(fragment, instance, child);
      }
    });
    menu.appendChild(fragment);
  }

  function appendOption(fragment, instance, option) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "custom-select-option";
    button.setAttribute("role", "option");
    button.dataset.value = option.value;
    button.textContent = option.textContent.trim();
    button.disabled = option.disabled;
    const isSelected = option.value === instance.select.value;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-selected", String(isSelected));
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled) return;
      setValue(instance, option.value, true);
    });
    fragment.appendChild(button);
  }

  function toggle(instance) {
    if (instance.select.disabled) return;
    if (activeInstance && activeInstance !== instance) close(activeInstance);
    if (instance.wrapper.classList.contains("is-open")) {
      close(instance);
    } else {
      open(instance);
    }
  }

  function open(instance) {
    activeInstance = instance;
    instance.wrapper.classList.add("is-open");
    instance.trigger.setAttribute("aria-expanded", "true");
    instance.menu.hidden = false;
    positionMenu(instance);
    const selected = instance.menu.querySelector(".custom-select-option.is-selected") || instance.menu.querySelector(".custom-select-option:not(:disabled)");
    if (selected) selected.scrollIntoView({ block: "nearest" });
  }

  function close(instance) {
    instance.wrapper.classList.remove("is-open", "align-right");
    instance.trigger.setAttribute("aria-expanded", "false");
    instance.menu.hidden = true;
    if (activeInstance === instance) activeInstance = null;
  }

  function setValue(instance, value, dispatchChange) {
    const previous = instance.select.value;
    instance.select.value = value;
    refresh(instance.select);
    close(instance);
    instance.trigger.focus();
    if (dispatchChange && previous !== value) {
      instance.select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function handleKeydown(event, instance) {
    if (instance.select.disabled) return;
    const options = Array.from(instance.menu.querySelectorAll(".custom-select-option:not(:disabled)"));
    if (!options.length) return;
    const currentIndex = Math.max(0, options.findIndex(option => option.classList.contains("is-selected")));

    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (!instance.wrapper.classList.contains("is-open")) {
        open(instance);
      } else {
        const active = document.activeElement && document.activeElement.classList.contains("custom-select-option")
          ? document.activeElement
          : options[currentIndex];
        if (active) setValue(instance, active.dataset.value, true);
      }
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!instance.wrapper.classList.contains("is-open")) open(instance);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = App.Geometry.clamp(currentIndex + direction, 0, options.length - 1);
      options[nextIndex].focus();
    }
  }

  function positionMenu(instance) {
    const rect = instance.wrapper.getBoundingClientRect();
    const viewportSpaceBelow = window.innerHeight - rect.bottom;
    instance.wrapper.classList.toggle("opens-up", viewportSpaceBelow < 260 && rect.top > viewportSpaceBelow);
    const menuWidth = Math.max(instance.wrapper.offsetWidth, instance.menu.scrollWidth);
    const overflowRight = rect.left + menuWidth > window.innerWidth - 12;
    const nearRightEdge = window.innerWidth - rect.right < 180;
    instance.wrapper.classList.toggle("align-right", (overflowRight || nearRightEdge) && rect.right > menuWidth);
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/"/g, '\\"');
  }

  App.CustomSelect = {
    init,
    enhance,
    enhanceAll,
    refresh
  };
})();
