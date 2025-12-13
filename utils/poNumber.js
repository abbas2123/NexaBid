
module.exports = function generatePONumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `PO-${y}${m}${d}-${rand}`;
}