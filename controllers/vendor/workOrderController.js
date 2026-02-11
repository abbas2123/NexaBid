const workOrderService = require('../../services/vendor/workOrderService');
const statusCode = require('../../utils/statusCode');
const { LAYOUTS, VIEWS, ERROR_MESSAGES } = require('../../utils/constants');

exports.viewWorkOrder = async (req, res) => {
  try {
    const fileUrl = await workOrderService.getWorkOrderFilePath(req.params.fileId);
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
  try {
    const workOrder = await workOrderService.getWorkOrderTrackingData(req.params.workOrderId);
    if (workOrder.redirectToPostAward) return res.redirect('/auth/dashboard');
    if (workOrder.status === 'completed') {
      return res.redirect(`/publisher/work-order/completed/completion-${workOrder._id}`);
    }
    res.render(VIEWS.WORK_ORDER_TRACKING, {
      layout: LAYOUTS.USER_LAYOUT,
      workOrder,
      user: req.user,
    });
  } catch (err) {
    console.error('Tracking page error:', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).redirect('/auth/dashboard');
  }
};

exports.addNote = async (req, res) => {
  try {
    const { workOrderId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(statusCode.BAD_REQUEST).json({ success: false, message: ERROR_MESSAGES.NOTE_EMPTY });
    await workOrderService.addWorkOrderNote(workOrderId, req.user._id, content);
    res.json({ success: true });
  } catch (err) {
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message });
  }
};

exports.reviewMilestone = async (req, res) => {
  try {
    await workOrderService.reviewWorkOrderMilestone(
      req.params.id,
      req.params.mid,
      req.body.action,
      req.body.comment
    );
    res.json({ success: true });
  } catch (err) {
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message });
  }
};

exports.approveProof = async (req, res) => {
  try {
    await workOrderService.approveWorkOrderProof(req.params.workOrderId, req.params.pid);
    res.json({ success: true });
  } catch (err) {
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message });
  }
};

exports.rejectProof = async (req, res) => {
  try {
    await workOrderService.rejectWorkOrderProof(req.params.workOrderId, req.params.pid, req.body.reason);
    res.json({ success: true });
  } catch (err) {
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message });
  }
};

exports.completeWorkOrder = async (req, res) => {
  try {
    const result = await workOrderService.completeWorkOrder(req.params.workOrderId);
    res.json({ success: true, workOrder: result.wo });
  } catch (err) {
    res.status(statusCode.BAD_REQUEST).json({ success: false, message: err.message });
  }
};

exports.workOrderCompletionPage = async (req, res) => {
  try {
    const data = await workOrderService.getWorkOrderCompletionSummary(req.params.id);
    res.render(VIEWS.WORK_ORDER_COMPLETED, {
      layout: LAYOUTS.USER_LAYOUT,
      ...data,
      user: req.user,
    });
  } catch (err) {
    res.redirect('/auth/dashboard');
  }
};

exports.downloadReport = async (req, res) => {
  try {
    const fileUrl = await workOrderService.downloadReport(req.params.workOrderId);
    return res.redirect(fileUrl);
  } catch (err) {
    console.error('Download report error:', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.FAILED_EXPORT_PDF });
  }
};
