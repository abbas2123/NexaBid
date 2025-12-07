const User = require("../../models/user");
const vendorApplication = require("../../models/vendorApplication");
const Property = require("../../models/property");
const Tender = require("../../models/tender");
const { fi } = require("zod/locales");
const bcrypt = require('bcrypt');
const { success } = require("zod");
const path = require("path");
const fs = require("fs");


exports.userStatus = async (userId) => {
 
  const vendorApp = await vendorApplication
    .findOne({ userId })
    .populate("documents.fileId")
    .populate("ocrResultId");

const query = { sellerId: userId, deletedAt: null };
  const userProperties = await Property.find(query)
    .sort({ createdAt: -1 })
    .lean();


  let propertyStatus = "No Properties Submitted";

  if (userProperties.length > 0) {
    const latest = userProperties[0];

    propertyStatus = latest.verificationStatus === "submitted"
      ? "Pending Review"
      : latest.verificationStatus === "approved"
      ? "Approved"
      : latest.verificationStatus === "rejected"
      ? "Rejected"
      : "Unknown";
  }

  const tenderStatus = "No Tender Activity";

  return {
    vendorApp,
    tenderStatus,
    propertyStatus,
    userProperties,
  };
};
exports.changePassword = async(userId,currectPassword,newPassword,confirmPassword)=>{
  const user =  await User.findById(userId);

  if(!user) throw new Error('User not found');

  const isMatch = await bcrypt.compare(currectPassword,user.passwordHash);
  if(!isMatch) throw new Error("Password not currect");

  if (newPassword !== confirmPassword) {
    return { success: false, message: "Passwords do not match" };
  };
  
  const hashed = await bcrypt.hash(newPassword,10);
  
  user.passwordHash = hashed;
  await user.save();

  return({success:true});
}

exports.updateProfile = async (userId, data = {}, fileInput = null) =>{
  if (!userId) throw new Error("userId is required");

  const updateData = {};

  if (data.name && String(data.name).trim() !== "") updateData.name = String(data.name).trim();
  if (data.phone && String(data.phone).trim() !== "") updateData.phone = String(data.phone).trim();

  let avatarFile;
  if (fileInput) {
    if (Array.isArray(fileInput) && fileInput.length > 0) {
    
      avatarFile = fileInput.find((f) => f.fieldname === "avatar") || fileInput[0];
    } else if (fileInput.fieldname) {
      avatarFile = fileInput;
    }
  }

  if (avatarFile && avatarFile.filename) {
    const publicPath = `/uploads/avatar/${avatarFile.filename}`;
    updateData.avatar = publicPath;

    try {
      const existing = await User.findById(userId).select("avatar").lean();
      if (existing && existing.avatar) {
        const oldFilename = path.basename(existing.avatar);
        const oldFull = path.join(process.cwd(), "uploads", "avatar", oldFilename);
        if (fs.existsSync(oldFull)) {
          fs.unlinkSync(oldFull);
        }
      }
    } catch (err) {
     
      console.warn("Could not remove old avatar:", err.message);
    }
  }

  
  if (Object.keys(updateData).length === 0) {
    const user = await User.findById(userId).lean();
    return user;
  }

  const updated = await User.findByIdAndUpdate(userId, updateData, { new: true }).lean();
  return updated;
}
