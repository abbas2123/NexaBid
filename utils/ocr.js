const vision = require('@google-cloud/vision');
const { withTimeout } = require('./promiseUtils');

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

exports.extractTextFromImage = async (filePath) => {
  try {
    const [result] = await withTimeout(
      client.textDetection(filePath),
      15000,
      'Google Vision OCR timed out'
    );
    const detection = result?.textAnnotations;
    if (!detection || detection.length === 0) {
      console.warn('OCR: no text detected for', filePath);
      return {
        text: '',
        businessName: null,
        panNumber: null,
        gstNumber: null,
      };
    }
    const extractedText = detection[0].description || '';
    const pan = extractPAN(extractedText);
    const gst = extractGST(extractedText);
    const businessName = extractBusinessName(extractedText, pan, gst);
    return {
      text: extractedText,
      businessName,
      panNumber: pan,
      gstNumber: gst,
    };
  } catch (err) {
    console.error('OCR Error for', filePath, (err && err.message) || err);
    return {
      text: '',
      businessName: null,
      panNumber: null,
      gstNumber: null,
    };
  }
};
function extractPAN(text) {
  if (!text) return null;
  const match = text.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
  return match ? match[1] : null;
}
function extractGST(text) {
  if (!text) return null;
  const gstRegex = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z])\b/;
  const match = text.match(gstRegex);
  if (match) return match[1];
  const fallback = text.replace(/\s+/g, '');
  const fmatch = fallback.match(/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]/);
  return fmatch ? fmatch[0] : null;
}
function extractBusinessName(text, pan, gst) {
  if (!text) return null;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (pan && line.includes(pan)) continue;
    if (gst && line.includes(gst)) continue;
    if (/^[0-9-/\s]+$/.test(line)) continue;
    if (line.length < 3) continue;
    if (/^(PAN|GST|GSTIN|INCOME TAX|TAX|FORM|DATE)$/i.test(line)) continue;
    return line;
  }
  return lines.length ? lines[0] : null;
}
