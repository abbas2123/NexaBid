const tenderEvaluationService = require('../../services/user/tenderEvaluationService');
const { LAYOUTS, ERROR_MESSAGES } = require('../../utils/constants');

exports.getTenderEvaluation = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const {
      tenders,
      stats,
      pagination,
      userRole
    } = await tenderEvaluationService.getTenderEvaluationData(req.user, req.admin, req.query, page, limit);

    res.render('user/tenderEvaluation', {
      title: 'Tender Evaluation Reports',
      tenders,
      stats,
      filters: req.query,
      userRole,
      layout: LAYOUTS.USER_LAYOUT,
      pagination,
      queryParams: new URLSearchParams(req.query).toString()
        ? '&' + new URLSearchParams(req.query).toString()
        : '',
    });
  } catch (error) {
    console.error('Tender Evaluation Error:', error);
    res.status(500).render('error', {
      message: ERROR_MESSAGES.ERROR_FETCHING_TENDER_REPORTS,
      error,
    });
  }
};

exports.exportTenderEvaluationPDF = async (req, res) => {
  try {
    const doc = await tenderEvaluationService.generateEvaluationPDF(req.user, req.admin, req.body);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=tender-evaluation-report.pdf');

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ message: ERROR_MESSAGES.FAILED_EXPORT_PDF });
  }
};
