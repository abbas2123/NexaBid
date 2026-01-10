

const postAwardService = require('../../services/vendor/postAward');
const statusCode = require('../../utils/statusCode');
const { LAYOUTS, VIEWS, ERROR_MESSAGES } = require('../../utils/constants');

exports.viewWorkOrder = async (req, res) => {
  try {
    const fileUrl = await postAwardService.getWorkOrderFilePath(req.params.fileId);
    return res.redirect(fileUrl);
  } catch (err) {
    console.error('View work order error:', err.message);
    res.status(statusCode.NOT_FOUND).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.WORK_ORDER_NOT_FOUND,
      user: req.user,
    });
  }
};

exports.trackingPage = async (req, res) => {
  const workOrder = await postAwardService.getTrackingData(req.params.workOrderId);

  if (workOrder.redirectToPostAward) return res.redirect('/auth/dashboard');
  if (workOrder.status === 'completed') {
    return res.redirect(`/vendor/work-order/complete/completion-${workOrder._id}`);
  }
  res.render(VIEWS.WORK_ORDER_TRACKING, {
    layout: LAYOUTS.USER_LAYOUT,
    workOrder,
    user: req.user,
  });
};

exports.addNote = async (req, res) => {
  const { workOrderId } = req.params;
  const { content } = req.body;

  if (!content) return res.status(400).json({ success: false, message: 'Note empty' });

  await postAwardService.addNote(workOrderId, req.user._id, content);
  res.json({ success: true });
};

exports.reviewMilestone = async (req, res) => {
  await postAwardService.reviewMilestone(
    req.params.id,
    req.params.mid,
    req.body.action,
    req.body.comment
  );
  res.json({ success: true });
};

exports.approveProof = async (req, res) => {
  await postAwardService.approveProof(req.params.workOrderId, req.params.pid);
  res.json({ success: true });
};

exports.rejectProof = async (req, res) => {
  await postAwardService.rejectProof(req.params.workOrderId, req.params.pid, req.body.reason);
  res.json({ success: true });
};

exports.completeWorkOrder = async (req, res) => {
  const result = await postAwardService.completeWorkOrder(req.params.workOrderId);
  if (result.wo.status === 'completed') {
    return res.redirect(`/vendor/work-order/complete/completion-${result.wo._id}`);
  }
  res.json({ success: true });
};

exports.workOrderCompletionPage = async (req, res) => {
  try {
    const data = await postAwardService.getCompletionSummary(req.params.id);

    res.render(VIEWS.WORK_ORDER_COMPLETED, {
      layout: LAYOUTS.USER_LAYOUT,
      ...data,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/auth/dashboard');
  }
};
