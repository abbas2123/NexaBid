const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" ,require:true},
  otpHash: {type:String,require:true},
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 
  }
});

module.exports = mongoose.model("Otp", otpSchema);