const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');
const PurchaseOrder = require('../../models/purchaseOrder');
const Agreement = require('../../models/agreement');
const WorkOrder = require('../../models/workOrder');
const { ERROR_MESSAGES } = require('../../utils/constants');

exports.getContractManagementData = async (publisherId, tab, isAdmin = false) => {
  const tenderQuery = {
    status: { $in: ['published', 'awarded'] },
  };

  if (!isAdmin) {
    tenderQuery.createdBy = publisherId;
  }

  const tenders = await Tender.find(tenderQuery).lean();

  let totalBids = 0;
  let active = 0;
  let pending = 0;
  let completed = 0;

  const contracts = [];

  for (const tender of tenders) {
    const bidsCount = await TenderBid.countDocuments({ tenderId: tender._id });
    totalBids += bidsCount;

    const winnerBid = await TenderBid.findOne({
      tenderId: tender._id,
      isWinner: true,
    }).populate('vendorId');

    const po = await PurchaseOrder.findOne({ tenderId: tender._id });
    const agreement = await Agreement.findOne({ tenderId: tender._id });
    const workOrder = await WorkOrder.findOne({ tenderId: tender._id });

    let contractStatus = 'Awarded';

    if (po) contractStatus = 'PO Issued';
    if (po?.status === 'vendor_accepted') contractStatus = 'Awaiting Agreement';
    if (agreement?.uploadedByVendor) contractStatus = 'Agreement Pending Approval';

    if (agreement?.approvedByPublisher) {
      contractStatus = 'Contract Active';
      active++;
    }

    if (workOrder) {
      contractStatus = 'Work Started';
      completed++;
    }

    if (po && !agreement?.approvedByPublisher) pending++;

    contracts.push({
      tenderId: tender._id,
      title: tender.title,
      totalBids: bidsCount,
      winner: winnerBid
        ? {
            name: winnerBid.vendorId.name,
            amount: winnerBid.quotes.amount,
          }
        : null,
      poStatus: po ? po.status : 'Not Generated',
      agreementStatus: agreement
        ? agreement.approvedByPublisher
          ? 'Approved'
          : 'Pending'
        : 'Not Uploaded',
      workOrderStatus: workOrder ? 'Issued' : 'Not Issued',
      contractStatus,
    });
  }

  return {
    summary: {
      totalTenders: tenders.length,
      totalBids,
      active,
      pending,
      completed,
    },
    contracts,
  };
};

exports.getContractDetails = async (adminId, tenderId) => {
  const tender = await Tender.findOne({
    _id: tenderId,
    status: 'awarded',
  })
    .populate('createdBy', 'name')
    .lean();
  console.log('tender', tender);
  if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);

  const bids = await TenderBid.find({ tenderId });
  const winnerBid = await TenderBid.findOne({
    tenderId,
    isWinner: true,
  }).populate('vendorId', 'name email');
  const po = await PurchaseOrder.findOne({ tenderId }).select('pdfFile status');
  const agreement = await Agreement.findOne({ tenderId });
  const workOrder = await WorkOrder.findOne({ tenderId });
  const documents = [];

  if (po?.pdfFile) {
    documents.push({
      label: 'Purchase Order',
      fileId: po.pdfFile,
      url: `/admin/contract-management/file/${po.pdfFile}`,
    });
  }

  if (agreement?.publisherAgreement) {
    documents.push({
      label: 'Publisher Agreement',
      fileId: agreement.publisherAgreement,
      url: `/admin/contract-management/file/${agreement.publisherAgreement}`,
    });
  }

  if (agreement?.uploadedByVendor) {
    documents.push({
      label: 'Vendor Signed Agreement',
      fileId: agreement.uploadedByVendor,
      url: `/admin/contract-management/file/${agreement.uploadedByVendor}`,
    });
  }

  if (workOrder?.file) {
    documents.push({
      label: 'Work Order',
      fileId: workOrder.file,
      url: `/admin/contract-management/file/${workOrder.file}`,
    });
  }
  return {
    title: tender.title,
    dept: tender.dept,
    publisher: tender.createdBy.name,
    awardedOn: tender.updatedAt.toDateString(),

    totalBids: bids.length,
    winner: winnerBid
      ? {
          name: winnerBid.vendorId?.name || 'Vendor',
          amount: typeof winnerBid.quotes?.amount === 'number' ? winnerBid.quotes.amount : 0,
        }
      : null,

    timeline: [
      { label: 'Tender Awarded', done: true },
      { label: 'PO Issued', done: !!po },
      { label: 'Vendor Accepted PO', done: po?.status === 'vendor_accepted' },
      { label: 'Agreement Uploaded', done: !!agreement?.uploadedByVendor },
      { label: 'Agreement Approved', done: !!agreement?.approvedByPublisher },
      { label: 'Work Order Issued', done: !!workOrder },
    ],
    documents,
  };
};
