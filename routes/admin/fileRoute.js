// routes/admin/fileRoute.js
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const File = require("../../models/File");
const statusCode = require("../../utils/statusCode");

const router = express.Router();

// GET /admin/file/:id  -> serves file saved on disk (File doc must exist)
router.get('/:id', async (req, res) => {
  try {
    const fileDoc = await File.findById(req.params.id);
    if (!fileDoc) return res.status(404).send('File not found');

    const absPath = fileDoc.fileUrl; // 💯 Already absolute

    if (!fs.existsSync(absPath))
      return res.status(404).send('File not found on server');

    return res.download(absPath, fileDoc.fileName);
  } catch (err) {
    console.error('Download error:', err);
    return res.status(500).send('Server error');
  }
});

module.exports = router;
