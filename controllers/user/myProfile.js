
const router = require('../../routes/user/authRoute');
const myProfileService = require('../../services/profile/myProfileService');
const statusCode = require("../../utils/statusCode");



exports.changePassword = async(req,res) =>{
  try {
    console.log('req.body',req.body)
    const {userId,newPassword,currentPassword,confirmPassword} = req.body;

    if(!newPassword||!currentPassword||!confirmPassword){
      return res.json({
        success:false,
        message:"All field require"
      });
    }

    const response = await myProfileService.changePassword(userId,currentPassword,newPassword,confirmPassword);

    return res.status(statusCode.OK).json({
      success:true,
      message:"Password Change is successfull"
    });
  } catch (err) {
    res.status(statusCode.INTERNAL_ERROR).json({
      success:false,
      message:err.message
    });

  }
}

exports.updateProfile =  async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(statusCode.UNAUTHORIZED).json({ success: false, message: "Unauthorized" });

    
    const fileInput = req.file || req.files || null;

    const updatedUser = await myProfileService.updateProfile(userId, req.body || {}, fileInput);

    return res.json({
      success: true,
      message: "Profile updated",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Profile update error (controller):", err);
    return res.status(statusCode.INTERNAL_ERROR).json({ success: false, message: err.message || "Server error" });
  }
}

