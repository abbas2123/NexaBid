const tenderService = require("../../services/tender/tender");

exports.getTenderListingPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;

    const { tenders, pagination } =
      await tenderService.getAllTenders(page);

    res.render("user/tender", {
      layout: "layouts/user/userLayout",
      tenders,
      pagination,
      user: req.user,
    });

  } catch (err) {
    console.error("Tender list error:", err);
    res.status(500).send("Server Error");
  }
};

exports.getTenderDetailsPage = async (req, res) => {
  const tender = await tenderService.getTenderDetails(req.params.id);

  res.render("user/tenderDetails", {
    layout: "layouts/user/userLayout.ejs",
    tender,
    user: req.user
  });
};