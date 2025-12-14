const mongoose = require("mongoose");

const propertyBidSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  bidderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  status: String,
  isWinner: Boolean,
  projectStatus: String,
});

module.exports = mongoose.model("PropertyBid", propertyBidSchema);