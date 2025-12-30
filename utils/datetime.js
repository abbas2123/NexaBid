function parseLocalDatetime(localStr) {
  // localStr example: "2025-12-26T23:50"
  if (!localStr) return null;

  const [d, t] = localStr.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);

  // Constructs a Date in SERVER LOCAL TIMEZONE
  return new Date(y, m - 1, day, hh, mm, 0, 0);
}

function formatIST(date) {
  if (!date) return null;
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function toDatetimeLocalValue(date) {
  // Converts Date -> "YYYY-MM-DDTHH:mm" in IST (useful to set input values)
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

module.exports = {
  parseLocalDatetime,
  formatIST,
  toDatetimeLocalValue,
};
