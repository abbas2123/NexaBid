const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: null },
  passwordHash: { type: String, required: null },
  isVerified: { type: Boolean, default: false },
  role: { type: String, default: "user", enum: ["user", "vendor", "admin"] },
  status: { type: String, default: "active", enum: ["active", "blocked"] },

  twoFA: { type: Boolean, default: false },
  twoFASecret: { type: String, default: null },

  isVendor: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);