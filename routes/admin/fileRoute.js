const express = require('express');
const fs = require('fs');
const File = require('../../models/File');
const statusCode = require('../../utils/statusCode');

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const fileDoc = await File.findById(req.params.id);
    if (!fileDoc) return res.status(statusCode.NOT_FOUND).send('File not found');

    const absPath = fileDoc.fileUrl;

    if (!fs.existsSync(absPath))
      return res.status(statusCode.NOT_FOUND).send('File not found on server');

    return res.download(absPath, fileDoc.fileName);
  } catch (err) {
    console.error('Download error:', err);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).send('Server error');
  }
});

module.exports = router;
