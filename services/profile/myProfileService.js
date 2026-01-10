const bcrypt = require('bcrypt');
const User = require('../../models/user');
const { ERROR_MESSAGES } = require('../../utils/constants');
const { VALIDATION_MESSAGES } = require('../../utils/constants');

exports.changePassword = async (userId, currectPassword, newPassword, confirmPassword) => {
  const user = await User.findById(userId);

  if (!user) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);

  const isMatch = await bcrypt.compare(currectPassword, user.passwordHash);
  if (!isMatch) throw new Error(ERROR_MESSAGES.PASSWORD_NOT_CORRECT);

  if (newPassword !== confirmPassword) {
    return { success: false, message: VALIDATION_MESSAGES.PASSWORDS_DO_NOT_MATCH };
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  user.passwordHash = hashed;
  await user.save();

  return { success: true };
};

exports.updateProfile = async (userId, data = {}, fileInput = null) => {
  if (!userId) throw new Error(ERROR_MESSAGES.USER_ID_REQUIRED_SERVICE);

  const updateData = {};

  if (data.name && String(data.name).trim() !== '') updateData.name = String(data.name).trim();
  if (data.phone && String(data.phone).trim() !== '') updateData.phone = String(data.phone).trim();

  let avatarFile;
  if (fileInput) {
    if (Array.isArray(fileInput) && fileInput.length > 0) {
      avatarFile = fileInput.find((f) => f.fieldname === 'avatar') || fileInput[0];
    } else if (fileInput.fieldname) {
      avatarFile = fileInput;
    }
  }

  if (avatarFile) {
    if (avatarFile.path) {
      updateData.avatar = avatarFile.path;
    } else if (avatarFile.buffer) {
      const { uploadToCloudinary } = require('../../utils/cloudinaryHelper');
      const cld = await uploadToCloudinary(
        avatarFile.buffer,
        'nexabid/profiles',
        avatarFile.originalname || 'avatar',
        'image'
      );
      updateData.avatar = cld.secure_url;
    }
  }

  if (Object.keys(updateData).length === 0) {
    const user = await User.findById(userId).lean();
    return user;
  }

  const updated = await User.findByIdAndUpdate(userId, updateData, { new: true }).lean();
  return updated;
};
