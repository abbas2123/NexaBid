const myProfileService = require('../../services/profile/myProfileService');
const statusCode = require('../../utils/statusCode');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../utils/constants');

exports.changePassword = async (req, res) => {
  try {
    const { newPassword, currentPassword, confirmPassword } = req.body;
    const userId = req.user._id;

    if (!newPassword || !currentPassword || !confirmPassword) {
      return res.json({
        success: false,
        message: ERROR_MESSAGES.ALL_FIELDS_REQUIRED,
      });
    }

    await myProfileService.changePassword(userId, currentPassword, newPassword, confirmPassword);

    return res.status(statusCode.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.PASSWORD_CHANGED,
    });
  } catch (err) {
    res.status(statusCode.INTERNAL_ERROR).json({
      success: false,
      message: err.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId)
      return res
        .status(statusCode.UNAUTHORIZED)
        .json({ success: false, message: ERROR_MESSAGES.UNAUTHORIZED });

    const fileInput = req.file || req.files || null;

    const updatedUser = await myProfileService.updateProfile(userId, req.body || {}, fileInput);

    return res.json({
      success: true,
      message: SUCCESS_MESSAGES.PROFILE_UPDATED_SUCCESS,
      user: updatedUser,
    });
  } catch (err) {
    console.error('Profile update error (controller):', err);
    return res
      .status(statusCode.INTERNAL_ERROR)
      .json({ success: false, message: err.message || 'Server error' });
  }
};
