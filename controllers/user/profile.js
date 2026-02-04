const myProfileService = require('../../services/profile/profileService');
const statusCode = require('../../utils/statusCode');
const { LAYOUTS, VIEWS, ERROR_MESSAGES } = require('../../utils/constants');
const vendorService = require('../../services/vendor/applicationService');
exports.userProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/auth/login');
    }
    const { user } = req;
    const application = await vendorService.getApplicationStatus(user._id);
    res.render('profile/profile', {
      layout: LAYOUTS.USER_LAYOUT,
      title: 'My profile - NexaBid',
      user: user || {},
      application: application || null,
    });
  } catch (error) {
    console.error('Profile load Error:', error);
    res.status(statusCode.INTERNAL_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
      user: req.user,
    });
  }
};
exports.getUserStatuspage = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/auth/login');
    }
    const { user } = req;
    const userId = user._id;
    const { vendorApp, propertyStatus, tenderStatus, latestTender, userProperties, userTenders } =
      await myProfileService.userStatus(userId);
    return res.render('profile/status', {
      layout: LAYOUTS.USER_LAYOUT,
      title: 'Account Status',
      user,
      vendorApp,
      tenderStatus,
      propertyStatus,
      tenders: userTenders,
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
      return res.redirect('/auth/login');
    }
    const { user } = await myProfileService.getMyProfileData(req.user._id);
    return res.render('profile/myProfile.ejs', {
      layout: LAYOUTS.USER_LAYOUT,
      title: 'My Profile',
      user,
      application: null,
    });
  } catch (err) {
    console.error('❌ Profile load error:', err);
    return res.redirect('/auth/dashboard');
  }
};
exports.getAboutUs = (req, res) => {
  res.render('profile/aboutUs', {
    layout: LAYOUTS.USER_LAYOUT,
    user: req.user,
  });
};
exports.getContact = (req, res) => {
  res.render('user/contact', {
    layout: LAYOUTS.USER_LAYOUT,
    user: req.user,
  });
};

exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(statusCode.BAD_REQUEST).json({ success: false, message: 'No file uploaded' });
    }

    const avatarUrl = req.file.path; // Multer-Cloudinary provides path for the URL
    await myProfileService.updateAvatar(req.user._id, avatarUrl);

    res.status(statusCode.OK).json({ success: true, message: 'Avatar updated' });
  } catch (error) {
    console.error('Update Avatar Error:', error);
    res.status(statusCode.INTERNAL_ERROR).json({ success: false, message: 'Update failed' });
  }
};
