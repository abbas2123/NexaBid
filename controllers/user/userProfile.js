const vendorService = require('../../services/vendor/applicationService');
const myProfileService = require('../../services/profile/profileService');
const statusCode = require('../../utils/statusCode');
const User = require('../../models/user');
const Property = require('../../models/property');
const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');

exports.userProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/auth/login');
    }
    const user = req.user;
    const application = await vendorService.getApplicationStatus(user._id);

    res.render('profile/profile', {
      layout: 'layouts/user/userLayout',
      title: 'My profile - NexaBid',
      user: user || {},
      application: application || null,
    });
  } catch (error) {
    console.error('Profile load Error:', error);
    res.status(statusCode.INTERNAL_ERROR).send('Server Error');
  }
};

exports.getUserStatuspage = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/auth/login');
    }

    const user = req.user;
    const userId = user._id;

    const {
      vendorApp,
      propertyStatus,
      tenderStatus,
      latestTender,
      userProperties,
      userTenders,
    } = await myProfileService.userStatus(userId);

    return res.render('profile/status', {
      layout: 'layouts/user/userLayout',
      title: 'Account Status',
      user,
      vendorApp,
      tenderStatus,
      propertyStatus,
      tenders: userTenders, // ADD THIS
      latestTender,
      properties: userProperties || [],
    });
  } catch (error) {
    console.error('Status Page Error:', error);
    return res.redirect('/auth/login');
  }
};

exports.logOut = (req, res) => {
  try {
    res.clearCookie('token');
    return res.redirect('/auth/login');
  } catch (error) {
    console.error('logout error:', error);
    return res.redirect('/');
  }
};

exports.getMyProfile = async (req, res) => {
  try {
  
    if (!req.user) {
      console.log('❌ No req.user → Redirecting to login');
      return res.redirect('/auth/login');
    }

    
    const freshUser = await User.findById(req.user._id);

    if (!freshUser) {
      console.log('❌ User not found in DB');
      return res.redirect('/auth/login');
    }

   
    return res.render('profile/myProfile.ejs', {
      layout: 'layouts/user/userLayout',
      title: 'My Profile',
      user: freshUser,
      application: null,
    });
  } catch (err) {
    console.error('❌ Profile load error:', err);
    return res.redirect('/auth/dashboard');
  }
};

exports.getMyListingPage = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log('Logged-in User:', userId);

    const properties = await Property.find({
      sellerId: userId,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log('Fetched Properties:', properties);
    const tenders = await Tender.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .lean();

    res.render('profile/myListing', {
      layout: 'layouts/user/userLayout',
      user: req.user,
      properties,
      tenders,
    });
  } catch (err) {
    console.log('GLOBAL ERROR HANDLER:', err);

    return res.status(500).render('error', {
      layout: 'layouts/user/userLayout',
      message: 'Unable to load listings',
    });
  }
};

exports.getAboutUs = (req, res) => {
  res.render('profile/aboutUs', {
    layout: 'layouts/user/userLayout',
    user: req.user,
  });
};

exports.getContact = (req, res) => {
  res.render('user/contact', {
    layout: 'layouts/user/userLayout',
    user: req.user,
  });
};

exports.getMyParticipation = async (req, res) => {
  try {
    const userId = req.user._id;

    const { properties, tenders } =
      await myProfileService.getMyParticipationData(userId);

    return res.render('profile/myParticipation', {
      layout: 'layouts/user/userLayout',
      user: req.user,
      properties,
      tenders,
    });
  } catch (err) {
    console.error('Participation Page Error:', err);
    return res.status(500).send('Server Error');
  }
};
exports.viewTenderPostAward = async (req, res) => {
  try {
    const tenderId = req.params.id;
    const userId = req.user._id;
    console.log('tenderId', tenderId);

    const bid = await TenderBid.findOne({ tenderId, vendorId: userId });

    if (!bid) {
      return res.redirect(`/vendor/tender/${tenderId}/bid`);
    }

    const hasTechFiles = bid.techForms?.files && bid.techForms.files.length > 0;
    const hasFinFiles = bid.finForms?.files && bid.finForms.files.length > 0;

    const techStatus = bid.techReviewStatus;
    const finStatus = bid.finReviewStatus;

    if (!hasTechFiles) {
      return res.redirect(`/vendor/tender/${tenderId}/bid`);
    }

    if (hasTechFiles && techStatus !== 'accepted') {
      return res.redirect(`/vendor/tender/${tenderId}/bid`);
    }

    if (techStatus === 'accepted' && !hasFinFiles) {
      return res.redirect(`/vendor/tender/${tenderId}/financial`);
    }

    if (techStatus === 'accepted' && hasFinFiles && finStatus !== 'accepted') {
      return res.redirect(`/vendor/tender/${tenderId}/financial`);
    }

    const result = await myProfileService.getVendorPostAwardData(
      tenderId,
      userId
    );
    console.log(result.po);

    if (result.loseView) {
      return res.render('profile/tenderLoseView', {
        layout: 'layouts/user/userLayout',
        tender: result.tender,
        bid: result.bid,
        user: req.user,
        po: result.po,
        error: req.query.error,
      });
    }

    if (result.redirectToAgreementUpload && !req.query.fromUpload) {
      return res.redirect(`/user/${tenderId}/upload?fromPostAward=true`);
    }

    return res.render('profile/vendorPostAward', {
      layout: 'layouts/user/userLayout',
      tender: result.tender,
      bid: result.bid,
      po: result.po,
      agreement: result.agreement,
      workOrder: result.workOrder,
      user: req.user,
      isRegenerated: result.isRegenerated,
    });
  } catch (err) {
    console.error('Post Award Error:', err.message);
    console.log('error.message', err.message);
    if (req.query.error) {
      return res.render('profile/vendorPostAward', {
        layout: 'layouts/user/userLayout',
        tender: null,
        bid: null,
        po: null,
        agreement: null,
        workOrder: null,
        user: req.user,
        error: req.query.error,
      });
    }

    return res.redirect(
      `/user/my-participation/tender/${req.params.id}?error=server_error`
    );
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

    if (err.message === 'PO_NOT_FOUND')
      return res.status(404).send('PO not found');

    return res.status(500).send('Server error');
  }
};

exports.getUploadPage = async (req, res) => {
  try {
    const tenderId = req.params.tenderId;

    const { publisherAgreement } =
      await myProfileService.getAgreementUploadData(tenderId, req.user._id);

    return res.render('profile/agreementUpload', {
      layout: 'layouts/user/userLayout',
      tenderId,
      user: req.user,
      publisherAgreement,
    });
  } catch (err) {
    console.error('Agreement page error:', err.message);

    const redirectBase = `/user/my-participation/tender/${req.params.id}`;

    if (err.message === 'PUBLISHER_AGREEMENT_NOT_FOUND') {
      return res.redirect(`${redirectBase}?error=publisher_agreement_missing`);
    }

    if (err.message === 'PO_NOT_ACCEPTED') {
      return res.redirect(`${redirectBase}?error=po_not_accepted`);
    }

    if (err.message === 'NOT_WINNER') {
      return res.redirect(`${redirectBase}?error=not_winner`);
    }

    if (err.message === 'PO_NOT_CREATED') {
      return res.redirect(`${redirectBase}?error=po_not_created`);
    }

    return res.redirect(`${redirectBase}?error=server_error`);
  }
};

exports.uploadSignedAgreement = async (req, res) => {
  try {
    await myProfileService.uploadVendorAgreement({
      tenderId: req.params.tenderId,
      vendorId: req.user._id,
      file: req.file,
    });

    return res.redirect(
      `/user/my-participation/tender/${req.params.tenderId}?agreement=uploaded`
    );
  } catch (err) {
    console.error(err.message);

    if (err.message === 'NO_FILE') {
      return res.status(400).send('No file uploaded');
    }
    return res.status(500).send('Error uploading agreement');
  }
};


