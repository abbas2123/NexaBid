exports.detectFraud = async (ocr) => {
  if (!ocr) {
    return { flags: [], severity: 'low' };
  }
  const flags = [];
  const pan = (ocr.panNumber || '').toString().trim();
  const gst = (ocr.gstNumber || '').toString().trim();
  const name = (ocr.businessName || '').toString().trim();
  const rawText = (ocr.text || '').toString();
  if (!pan) {
    flags.push('PAN not detected');
  } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    flags.push('PAN format looks invalid');
  }
  if (!gst) {
    flags.push('GST not detected');
  } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(gst)) {
    flags.push('GST format looks invalid');
  }
  if (pan && gst) {
    const panFromGst = gst.substring(2, 12);
    if (panFromGst !== pan) {
      flags.push('PAN in GST does not match detected PAN');
    }
  }
  if (!name) {
    flags.push('Business name not detected');
  } else if (/fake|test|demo|sample/i.test(name)) {
    flags.push('Suspicious business name');
  }
  if (/forged|unauthorized|invalid|not valid|fake/i.test(rawText)) {
    flags.push('Suspicious language found in document text');
  }
  let severity = 'low';
  if (flags.length >= 3) severity = 'high';
  else if (flags.length === 1 || flags.length === 2) severity = 'medium';
  return { flags, severity };
};
