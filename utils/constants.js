module.exports = {
  AUCTION_STATUS: {
    ENDED: 'ended',
  },
  PAYMENT_STATUS: {
    SUCCESS: 'success',
  },
  ERROR_MESSAGES: {
    INVALID_AUCTION: 'INVALID_AUCTION',
    UNAUTHORIZED: 'UNAUTHORIZED',
    PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
    BID_TOO_LOW: 'BID_TOO_LOW',
    PROPERTY_NOT_FOUND: 'Property not found',
    TENDER_NOT_FOUND: 'Tender not found',
    SERVER_ERROR: 'Server error',
    PAYMENT_NOT_FOUND: 'Payment not found',
    INVALID_REQUEST: 'Invalid request',
    TENDER_RESTRICTED: 'This tender is not yet published or visible to you.',
    GENERIC_ERROR: 'Something went wrong',
  },
  SUCCESS_MESSAGES: {
    PAYMENT_SUCCESSFUL: 'Payment successful',
    COUPON_REMOVED: 'Coupon removed successfully',
    TENDER_RESUBMITTED: 'Tender re-submitted successfully 🎉',
  },
  VIEWS: {
    LIVE_AUCTION: 'acution/liveAuction',
    PUBLISHER_VIEW: 'acution/publisherView',
    ENABLE_AUTO_BID: 'acution/enableAutoBid',
    ERROR: 'error',
    ESCROW_PAYMENT: 'payments/escrowPayment',
    PAYMENT_SUCCESS: 'payments/paymentSuccess',
    PAYMENT_FAILS: 'payments/paymentFails',
    TENDER_LISTING: 'user/tender',
    TENDER_DETAILS: 'user/tenderDetails',
  },
  LAYOUTS: {
    USER_LAYOUT: 'layouts/user/userLayout',
  },
  REDIRECTS: {
    DASHBOARD: '/dashboard',
    PROPERTIES: '/properties',
    MY_PARTICIPATION: '/user/my-participation',
    PAYMENT_FAILURE: '/payments/failure',
  },
};
