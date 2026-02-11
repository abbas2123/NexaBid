const myProfileService = require('../../services/profile/profileService');
const listingService = require('../../services/user/listingService');
const statusCode = require('../../utils/statusCode');
const { LAYOUTS, VIEWS, ERROR_MESSAGES } = require('../../utils/constants');
exports.getMyListingPage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { properties, tenders } = await listingService.getMyListings(userId);
    res.render('profile/myListing', {
      layout: LAYOUTS.USER_LAYOUT,
      user: req.user,
      properties,
      tenders,
    });
  } catch (err) {
    return res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.UNABLE_LOAD_LISTINGS,
    });
  }
};
exports.getMyParticipation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { properties, tenders } = await myProfileService.getMyParticipationData(userId);
    return res.render('profile/myParticipation', {
      layout: LAYOUTS.USER_LAYOUT,
      user: req.user,
      properties,
      tenders,
    });
  } catch (err) {
    console.error('Participation Page Error:', err);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
      user: req.user,
    });
  }
};

exports.viewTenderPostAward = async (req, res) => {
  try {
    const tenderId = req.params.id;
    const userId = req.user._id;

    const result = await myProfileService.getVendorPostAwardData(tenderId, userId);

    if (result.redirect) {
      return res.redirect(result.redirect);
    }

    if (result.redirectToWorkOrder) {
      return res.redirect(`/user/work-orders/${result.workOrderId}`);
    }

    if (result.redirectToAgreementUpload && !req.query.fromUpload) {
      return res.redirect(`/user/${tenderId}/upload`);
    }

    if (result.loseView) {
      return res.render('profile/tenderLoseView', {
        layout: LAYOUTS.USER_LAYOUT,
        tender: result.tender,
        bid: result.bid,
        user: req.user,
        po: result.po,
        error: req.query.error,
      });
    }

    return res.render('profile/vendorPostAward', {
      layout: LAYOUTS.USER_LAYOUT,
      tender: result.tender,
      bid: result.bid,
      po: result.po,
      agreement: result.agreement,
      workOrder: result.workOrder,
      isRegenerated: result.isRegenerated,
      user: req.user,
    });
  } catch (err) {
    console.error('Post Award Error:', err.message);
    if (err.message === ERROR_MESSAGES.TENDER_NOT_FOUND) {
      return res.status(statusCode.NOT_FOUND).render(VIEWS.ERROR, {
        layout: LAYOUTS.USER_LAYOUT,
        message: ERROR_MESSAGES.TENDER_NOT_FOUND,
        user: req.user,
      });
    }
    if (err.message === ERROR_MESSAGES.NOT_PARTICIPATED) {
      return res.status(statusCode.FORBIDDEN).render(VIEWS.ERROR, {
        layout: LAYOUTS.USER_LAYOUT,
        message: 'You have not participated in this tender.',
        user: req.user,
      });
    }
    return res.redirect(`/user/my-participation?error=${encodeURIComponent(err.message)}`);
  }
};
exports.vendorRespondPO = async (req, res) => {
  try {
    const result = await myProfileService.respondToPO({
      poId: req.params.id,
      action: req.body.action,
      reason: req.body.reason,
    });
    return res.redirect(
      `/user/my-participation/tender/${result.tenderId}?response=${result.response}`
    );
  } catch (err) {
    console.error(err.message);
    if (err.message === ERROR_MESSAGES.PO_NOT_FOUND) {
      return res.status(statusCode.NOT_FOUND).render(VIEWS.ERROR, {
        layout: LAYOUTS.USER_LAYOUT,
        message: ERROR_MESSAGES.PO_NOT_FOUND,
        user: req.user,
      });
    }
    return res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
      user: req.user,
    });
  }
};
exports.getUploadPage = async (req, res) => {
  try {
    const { tenderId } = req.params;
    const data = await myProfileService.getAgreementUploadData(tenderId, req.user._id);
    return res.render('profile/agreementUpload', {
      layout: LAYOUTS.USER_LAYOUT,
      tenderId,
      user: req.user,
      publisherAgreement: data.publisherAgreement,
      approved: data.approved,
      remarks: data.remarks,
      vendorAgreement: data.vendorAgreement || null,
      formAction: `/user/${tenderId}/upload`,
      downloadLink: data.publisherAgreement
        ? `/user/files/view/${data.publisherAgreement._id}?flags=attachment`
        : '#',
      viewLink: data.publisherAgreement ? `/user/files/view/${data.publisherAgreement._id}` : '#',
    });
  } catch (err) {
    console.error('Agreement page error:', err.message);
    return res.redirect(`/user/my-participation/tender/${req.params.tenderId}`);
  }
};
exports.uploadSignedAgreement = async (req, res) => {
  try {
    await myProfileService.uploadVendorAgreement({
      tenderId: req.params.tenderId,
      vendorId: req.user._id,
      file: req.file,
    });
    return res.redirect(`/user/my-participation/tender/${req.params.tenderId}`);
  } catch (err) {
    console.error(err.message);
    const base = `/user/my-participation/tender/${req.params.tenderId}`;
    if (err.message === ERROR_MESSAGES.NO_FILE) return res.redirect(base);
    if (err.message === ERROR_MESSAGES.PUBLISHER_AGREEMENT_NOT_FOUND) return res.redirect(base);
    if (err.message === ERROR_MESSAGES.PO_NOT_ACCEPTED) return res.redirect(base);
    if (err.message === ERROR_MESSAGES.AGREEMENT_ALREADY_SIGNED) return res.redirect(base);
    return res.redirect(base);
  }
};
exports.getWorkOrderDetails = async (req, res, next) => {
  try {
    const workOrder = await myProfileService.getWorkOrderDetailsService(req.params.id);
    if (workOrder.status === 'completed') {
      return res.redirect(`/publisher/work-order/completed/completion-${workOrder._id}`);
    }
    if (!workOrder) {
      return res.status(404).render('error/404', {
        layout: LAYOUTS.USER_LAYOUT,
        message: 'Work Order not found',
        user: req.user,
      });
    }
    res.render('profile/workOrderForbuyer', {
      layout: LAYOUTS.USER_LAYOUT,
      workOrder,
      user: req.user,
    });
  } catch (error) {
    console.error('Error fetching work order:', error);
    next(error);
  }
};
exports.uploadProof = async (req, res) => {
  try {
    await myProfileService.uploadProofService(
      req.params.woId,
      req.params.mid,
      req.file,
      req.user._id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
exports.completeMilestone = async (req, res) => {
  try {
    await myProfileService.completeMilestoneService(req.params.woId, req.params.mid);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
exports.completeWorkOrder = async (req, res) => {
  try {
    await myProfileService.completeWorkOrderService(req.params.woId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
exports.startMilestone = async (req, res) => {
  try {
    const { woId, mid } = req.params;
    const milestone = await myProfileService.startMilestoneService(woId, mid, req.user._id);
    res.json({
      success: true,
      message: 'Milestone started successfully',
      milestone,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};
