const landingService = require("../../services/landingService");

exports.loadLandingPage = async (req, res) => {
  try {
    const data = await landingService.getLandingPageData();

    res.render("landingPage", {
      layout: false,
      pageTitle: "NexaBid - Buy & Sell Properties",
      liveProperties: data.liveAuctions,
      upcomingProperties: data.upcomingAuctions,
      featuredProperties: data.featuredProperties,
    });
  } catch (error) {
    console.error("Landing Error:", error);
    res.status(500).send("Server Error");
  }
};
