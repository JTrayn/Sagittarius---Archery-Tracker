(function () {
  const App = window.ArcheryApp;

  function nowIso() {
    return new Date().toISOString();
  }

  function formatDateTime(value) {
    const date = parseDate(value);
    if (!date) return "Unknown date";
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function formatDateOnly(value) {
    const date = parseDate(value);
    if (!date) return "Unknown date";
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
  }

  function getDateKey(value) {
    const date = parseDate(value);
    if (!date) return "unknown";
    const pad = number => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function toDateTimeLocalValue(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    const pad = number => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function fromDateTimeLocalValue(value) {
    if (!value) return nowIso();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return nowIso();
    return date.toISOString();
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  App.Dates = { nowIso, formatDateTime, formatDateOnly, getDateKey, toDateTimeLocalValue, fromDateTimeLocalValue };
})();
