function parseLocalDatetime(localStr) {
  if (!localStr) return null;
  const [d, t] = localStr.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  // IST is UTC + 5:30
  // So, input time in IST = UTC time - 5:30
  // We construct UTC timestamp for input components, then subtract 5.5 hours
  const utcMs = Date.UTC(y, m - 1, day, hh, mm, 0, 0);
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  return new Date(utcMs - istOffsetMs);
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
