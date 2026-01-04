
const Tender = require('../../models/tender');
const File = require('../../models/File');
const statusCode = require('../../utils/statusCode');
const notificationService = require('../../services/notificationService');
const {
  VIEWS,
  LAYOUTS,
  ERROR_MESSAGES,
  TENDER_STATUS,
  SUCCESS_MESSAGES,
  NOTIFICATION_MESSAGES,
} = require('../../utils/constants');

exports.getAdminTenderPage = async (req, res) => {
  try {
    const tenders = await Tender.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.render(VIEWS.ADMIN_TENDER_MANAGEMENT, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      tenders,
      currentPage: 'tenders',
    });
  } catch (err) {
    console.error('Admin Tender Management error:', err);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      message: ERROR_MESSAGES.LOAD_TENDERS_FAILED,
    });
  }
};

exports.getTenderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const tender = await Tender.findById(id).populate('createdBy', 'name email').lean();

    if (!tender) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.TENDER_NOT_FOUND,
      });
    }

    const files = await File.find({
      relatedType: 'tender',
      relatedId: id,
    }).lean();

    return res.json({
      success: true,
      tender: {
        ...tender,
        files: files.map((f) => ({
          fileId: f._id,
          originalName: f.fileName,
          url: f.fileUrl,
          size: f.size,
        })),
      },
    });
  } catch (error) {
    console.error('Tender fetch error', error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};

exports.updateTenderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const allowedStatuses = Object.values(TENDER_STATUS);

    if (!allowedStatuses.includes(status)) {
      return res.status(statusCode.BAD_REQUEST).json({
        success: false,
        message: `${ERROR_MESSAGES.INVALID_STATUS}: ${status}`,
      });
    }

    const tender = await Tender.findById(id);

    if (!tender) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.TENDER_NOT_FOUND,
      });
    }

    tender.status = status;
    if (comment && comment.trim() !== '') {
      tender.adminComment = comment.trim(); 
    }

    await tender.save();
    const io = req.app.get('io');

    if (status === TENDER_STATUS.PUBLISHED) {
      await notificationService.sendNotification(
        tender.createdBy, 
        NOTIFICATION_MESSAGES.TENDER_PUBLISHED,
        `/tenders/${tender._id}`,
        io
      );
    }

  
    if (status === TENDER_STATUS.REJECTED) {
      await notificationService.sendNotification(
        tender.createdBy,
        NOTIFICATION_MESSAGES.TENDER_REJECTED,
        `/tenders/${tender._id}`,
        io
      );
    }

   
    if (status === TENDER_STATUS.CLOSED) {
      await notificationService.sendNotification(
        tender.createdBy,
        NOTIFICATION_MESSAGES.TENDER_CLOSED,
        `/tenders/${tender._id}`,
        io
      );
    }
    return res.json({
      success: true,
      message: `${SUCCESS_MESSAGES.STATUS_UPDATED} to ${status}`,
    });
  } catch (error) {
    console.error('Tender status update error:', error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
