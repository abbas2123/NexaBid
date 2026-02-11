const postAwardService = require('./postAward');
const workOrderPdf = require('./workOrderPdf');

exports.getWorkOrderTrackingData = async (workOrderId) => {
    return postAwardService.getTrackingData(workOrderId);
};

exports.addWorkOrderNote = async (workOrderId, userId, content) => {
    return postAwardService.addNote(workOrderId, userId, content);
};

exports.reviewWorkOrderMilestone = async (workOrderId, milestoneId, action, comment) => {
    return postAwardService.reviewMilestone(workOrderId, milestoneId, action, comment);
};

exports.approveWorkOrderProof = async (workOrderId, proofId) => {
    return postAwardService.approveProof(workOrderId, proofId);
};

exports.rejectWorkOrderProof = async (workOrderId, proofId, reason) => {
    return postAwardService.rejectProof(workOrderId, proofId, reason);
};

exports.completeWorkOrder = async (workOrderId) => {
    return postAwardService.completeWorkOrder(workOrderId);
};

exports.getWorkOrderCompletionSummary = async (workOrderId) => {
    return postAwardService.getCompletionSummary(workOrderId);
};

exports.getWorkOrderFilePath = async (fileId) => {
    return postAwardService.getWorkOrderFilePath(fileId);
};

exports.downloadReport = async (workOrderId) => {
    const data = await this.getWorkOrderCompletionSummary(workOrderId);
    const { workOrder } = data;

    if (workOrder.completionReport && workOrder.completionReport.fileUrl) {
        return workOrder.completionReport.fileUrl;
    }

    const pdfBuffer = await workOrderPdf.generateCompletionReport(workOrder);
    const fileUrl = await postAwardService.saveCompletionReport(workOrder._id, pdfBuffer);

    return fileUrl;
};
