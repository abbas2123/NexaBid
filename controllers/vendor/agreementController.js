

const postAwardService = require('../../services/vendor/postAward');
const statusCode = require('../../utils/statusCode');
const { LAYOUTS, VIEWS, ERROR_MESSAGES } = require('../../utils/constants');

exports.getUploadPage = async (req, res) => {
  try {
    console.log('❌dvdvddvwvwr');
    const tenderId = req.params.id;
    let data;

    data = await postAwardService.getPublisherAgreementUploadData(tenderId, req.user._id);


    return res.render(VIEWS.DRAFT_AGREEMENT, {
      layout: LAYOUTS.USER_LAYOUT,
      tenderId,
      user: req.user,
      publisherAgreement: data.publisherAgreement,
      approved: data.approved,
      remarks: data.remarks,
      vendorAgreement: data.vendorAgreement || null,
      formAction: `/publisher/tender/${tenderId}/agreement/upload`,
      downloadLink: data.publisherAgreement ? `/publisher/view/${data.publisherAgreement._id}` : '#',
      viewLink: data.publisherAgreement ? `/publisher/view/${data.publisherAgreement._id}` : '#'
    });
  } catch (err) {
    console.error('Agreement page error:', err.message);

    return res.redirect(`/publisher/tender/${req.params.id}/post-award`);
  }
};

exports.uploadAgreement = async (req, res) => {
  try {
    console.log('file');
    await postAwardService.uploadPublisherAgreement({
      tenderId: req.params.id,
      publisherId: req.user._id,
      file: req.file,
    });

    return res.redirect(`/publisher/tender/${req.params.id}/post-award`);
  } catch (err) {
    console.error(err.message);

    if (err.message === ERROR_MESSAGES.NO_FILE)
      return res.status(statusCode.BAD_REQUEST).send(ERROR_MESSAGES.NO_FILE_UPLOADED);

    if (err.message === ERROR_MESSAGES.WINNER_NOT_FOUND)
      return res.status(statusCode.BAD_REQUEST).send(ERROR_MESSAGES.WINNER_NOT_FOUND);

    return res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.UPLOAD_FAILED);
  }
};

// Add this debugging in your controller
exports.view = async (req, res) => {
  try {
    console.log('Requesting file ID:', req.params.id);
    
    const filePath = await postAwardService.viewAgreementFile(req.params.id);
    
    console.log('Generated file path:', filePath);
    
    return res.redirect(filePath);

  } catch (err) {
    console.error('View agreement error:', err.message);
    console.error('Full error:', err);

    if (err.message === ERROR_MESSAGES.FILE_NOT_FOUND) {
      return res.status(statusCode.NOT_FOUND).render(VIEWS.ERROR, {
        layout: LAYOUTS.USER_LAYOUT,
        message: ERROR_MESSAGES.FILE_NOT_FOUND,
        user: req.user,
      });
    }

    return res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.UNABLE_OPEN_FILE,
      user: req.user,
    });
  }
};


exports.approveAgreement = async (req, res) => {
  try {
    const agreement = await postAwardService.approveAgreement(req.params.agreementId);

    return res.redirect(`/vendor/tender/${agreement.tenderId}/agreement`);
  } catch (err) {
    console.error(err.message);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.APPROVAL_FAILED);
  }
};

exports.rejectAgreement = async (req, res) => {
  try {
    const agreement = await postAwardService.rejectAgreement({
      agreementId: req.params.agreementId,
      remarks: req.body.remarks,
    });
    return res.redirect(`/vendor/tender/${agreement.tenderId}/agreement`);
  } catch (err) {
    console.error(err.message);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.REJECT_FAILED);
  }
};
