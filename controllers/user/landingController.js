const landingService = require('../../services/landingService');
const statusCode = require('../../utils/statusCode');
const { VIEWS, ERROR_MESSAGES } = require('../../utils/constants');

exports.loadLandingPage = async (req, res) => {
  try {
    const data = await landingService.getLandingPageData();

    res.render(VIEWS.LANDING_PAGE, {
      layout: false,
      pageTitle: 'NexaBid - Buy & Sell Properties',
      liveProperties: data.liveAuctions,
      upcomingProperties: data.upcomingAuctions,
      featuredProperties: data.featuredProperties,
    });
  } catch (error) {
    console.error('Landing Error:', error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
