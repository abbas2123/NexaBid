// routes/admin/fileRoute.js
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const File = require("../../models/File");

const router = express.Router();

// GET /admin/file/:id  -> serves file saved on disk (File doc must exist)
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).send("Invalid file id");

    const fileDoc = await File.findById(id).lean();
    if (!fileDoc) return res.status(404).send("File not found");

    // fileUrl should be like "/uploads/vendor-docs/<filename>"
    const fileUrl = fileDoc.fileUrl;
    if (!fileUrl) return res.status(404).send("File path not stored");

    // Resolve absolute path from project root
    const absPath = path.join(__dirname, "../../", fileUrl);

    if (!fs.existsSync(absPath)) {
      console.error("File missing on disk:", absPath);
      return res.status(404).send("File not found on server");
    }

    // Set content-type header if available
    if (fileDoc.mimeType) res.setHeader("Content-Type", fileDoc.mimeType);
    // Optional: set Content-Disposition to force download
    // res.setHeader("Content-Disposition", `attachment; filename="${fileDoc.fileName || path.basename(absPath)}"`);

    return res.sendFile(absPath);
  } catch (err) {
    console.error("Error serving file:", err);
    return res.status(500).send("Server error");
  }
});

module.exports = router;
