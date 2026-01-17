const propertyService = require('../../services/admin/propertyService');
const statusCode = require('../../utils/statusCode');
const Property = require('../../models/property');
const PropertyBid = require('../../models/propertyBid');
const {
  VIEWS,
  LAYOUTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  AUCTION_STATUS,
  REDIRECTS,
} = require('../../utils/constants');
exports.getAllProperties = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const filter = {
      search: req.query.search || '',
      status: req.query.status || '',
    };
    console.log('rgrvrrbr', req.query.status);
    const properties = await propertyService.getAllProperties(page, filter);
    res.render(VIEWS.ADMIN_PROPERTY_MANAGEMENT, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      properties: properties.property,
      pagination: properties.pagination,
      applied: filter,
      liveAuctions: properties.liveAuctions,
      currentPage: 'property-management',
    });
  } catch (err) {
    console.error('Error loading properties:', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};
exports.getPropertyDetails = async (req, res) => {
  try {
    const property = await propertyService.getPropertyDetails(req.params.id);
    if (!property) {
      return res
        .status(statusCode.NOT_FOUND)
        .json({ success: false, message: ERROR_MESSAGES.PROPERTY_NOT_FOUND });
    }
    res.json({ success: true, property });
  } catch (err) {
    console.error('DETAIL FETCH ERROR:', err);
    res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
};
exports.approveProperty = async (req, res) => {
  try {
    const serviceResponse = await propertyService.approvePropertyService(
      req.params.id,
      req.admin.id,
      req.body.approveMessage,
      req.app.get('io')
    );
    if (!serviceResponse) {
      return res
        .status(statusCode.NOT_FOUND)
        .json({ success: false, message: ERROR_MESSAGES.PROPERTY_NOT_FOUND });
    }
    res.json({ success: true, message: SUCCESS_MESSAGES.PROPERTY_APPROVED });
  } catch (err) {
    console.error('APPROVE ERROR:', err);
    res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
};
exports.rejectProperty = async (req, res) => {
  try {
    const serviceResponse = await propertyService.rejectPropertyService(
      req.params.id,
      req.admin.id,
      req.body.rejectionMessage,
      req.app.get('io')
    );
    if (!serviceResponse) {
      return res
        .status(statusCode.NOT_FOUND)
        .json({ success: false, message: ERROR_MESSAGES.PROPERTY_NOT_FOUND });
    }
    res.json({ success: true, message: SUCCESS_MESSAGES.PROPERTY_REJECTED });
  } catch (err) {
    console.error('REJECT ERROR:', err);
    res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
};
exports.adminLiveAuctionPage = async (req, res) => {
  try {
    const { propertyId } = req.params;
    if (!propertyId) {
      return res.status(statusCode.BAD_REQUEST).send(ERROR_MESSAGES.PROPERTY_ID_MISSING);
    }
    const property = await Property.findById(propertyId)
      .populate('sellerId', 'name email')
      .populate('currentHighestBidder', 'name email')
      .lean();
    if (!property || !property.isAuction) {
      return res.redirect(REDIRECTS.ADMIN_PROPERTY_MANAGEMENT);
    }
    const bids = await PropertyBid.find({ propertyId })
      .populate('bidderId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    const now = new Date();
    let auctionStatus = AUCTION_STATUS.NOT_STARTED;
    if (now >= property.auctionStartsAt && now <= property.auctionEndsAt) {
      auctionStatus = AUCTION_STATUS.LIVE;
    } else if (now > property.auctionEndsAt) {
      auctionStatus = AUCTION_STATUS.ENDED;
    }
    res.render(VIEWS.ADMIN_AUCTION_VIEW, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      currentPage: 'auction',
      property,
      bids,
      auctionStatus,
      currentHighestBid: property.currentHighestBid || 0,
      highestBidder: property.currentHighestBidder,
      auctionEndsAt: property.auctionEndsAt,
      propertyId: property._id,
      user: req.user,
    });
  } catch (err) {
    console.error('Admin Live Auction Error:', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};
exports.getAuctionReport = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const data = await propertyService.getAuctionReportData(propertyId);
    if (!data) {
      return res
        .status(statusCode.NOT_FOUND)
        .json({ success: false, message: 'Property not found' });
    }
    let html = `
        <div class="space-y-6">
            <!-- Summary Header -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-bold uppercase text-slate-500">Property</p>
                            <p class="font-bold text-slate-800">${data.property.title}</p>
                        </div>
                        <a href="/admin/property-management/view/live/${data.property._id}" target="_blank" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1">
                            <span class="material-symbols-outlined text-[16px]">visibility</span>
                            View Live
                        </a>
                    </div>
                </div>
                 <div>
                    <p class="text-xs font-bold uppercase text-slate-500">Base Price</p>
                    <p class="font-bold text-slate-800">₹${(data.property.basePrice || 0).toLocaleString('en-IN')}</p>
                </div>
                 <div>
                    <p class="text-xs font-bold uppercase text-slate-500">Seller</p>
                    <p class="font-bold text-slate-800">${data.property.sellerId?.name || 'Unknown'}</p>
                    <p class="text-xs text-slate-500">${data.property.sellerId?.email || ''}</p>
                </div>
                 <div>
                    <p class="text-xs font-bold uppercase text-slate-500">Total Bids</p>
                    <p class="font-bold text-blue-600 text-xl">${data.totalBids}</p>
                </div>
            </div>
            <!-- Highest Bidder Section -->
            ${data.winningBid
        ? `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                    <p class="text-xs font-bold uppercase text-green-800">Use this User as Winner</p>
                    <p class="font-bold text-green-900 text-lg">₹${data.winningBid.amount.toLocaleString('en-IN')}</p>
                    <p class="text-sm text-green-800">${data.winningBid.bidderId?.name} <span class="text-xs opacity-75">(${data.winningBid.bidderId?.email})</span></p>
                </div>
                <div class="bg-white p-2 rounded-full shadow-sm">
                    <span class="material-symbols-outlined text-green-600">emoji_events</span>
                </div>
            </div>`
        : ''
      }
            <!-- Bid History Table -->
            <div>
                <h3 class="font-bold text-lg text-slate-800 mb-3 border-b pb-2">Bid History</h3>
                <div class="overflow-hidden rounded-lg border border-slate-200">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-slate-100 text-slate-600">
                            <tr>
                                <th class="p-3 font-semibold">Bidder</th>
                                <th class="p-3 font-semibold">Amount</th>
                                <th class="p-3 font-semibold text-right">Time</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 bg-white">
    `;
    if (data.bids.length > 0) {
      data.bids.forEach((bid) => {
        html += `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="p-3">
                        <div class="font-semibold text-slate-800">${bid.bidderId?.name || 'Unknown'}</div>
                        <div class="text-xs text-slate-500">${bid.bidderId?.email || 'N/A'}</div>
                    </td>
                    <td class="p-3 font-bold text-green-600">₹${bid.amount.toLocaleString('en-IN')}</td>
                    <td class="p-3 text-right text-slate-500 text-xs font-mono">
                        ${new Date(bid.createdAt).toLocaleString('en-IN')}
                    </td>
                </tr>
            `;
      });
    } else {
      html += `<tr><td colspan="3" class="p-8 text-center text-slate-400 italic">No bids have been placed yet.</td></tr>`;
    }
    html += `</tbody></table></div></div></div>`;
    res.json({ success: true, html });
  } catch (err) {
    console.error('Auction Report Controller Error:', err);
    res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
};
exports.toggleBlockProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked, blockingReason } = req.body;

    const property = await propertyService.toggleIsBlocked(id, isBlocked, blockingReason);
    console.log('klnwdvlkv');
    res.json({
      success: true,
      message: `Property ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
    });
  } catch (err) {
    console.error('Property block error:', err);
    res.json({ success: false, message: err.message });
  }
};
