const express = require("express");
const router = express.Router();
const Property = require("../../models/property");
const Tender = require("../../models/tender");

router.get("/", async (req, res) => {
  console.log("search");
  const q = req.query.q || "";

  if (!q.trim()) {
    return res.json({ properties: [], tenders: [] });
  }

  try {
    const properties = await Property.find({
      title: { $regex: q, $options: "i" },
    })
      .limit(5)
      .lean();

    const tenders = await Tender.find({
      title: { $regex: q, $options: "i" },
    })
      .limit(5)
      .lean();

    res.json({ properties, tenders });
  } catch (err) {
    console.error(err);
    res.json({ properties: [], tenders: [] });
  }
});

module.exports = router;
