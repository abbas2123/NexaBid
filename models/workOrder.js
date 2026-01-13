const mongoose = require('mongoose');
const milestoneSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'pending_review', 'completed'],
      default: 'scheduled',
    },
    vendorUpdate: String,
    approvedAt: Date,
  },
  { _id: true }
);
const proofSchema = new mongoose.Schema({
  milestoneId: { type: mongoose.Schema.Types.ObjectId, required: true },
  filename: String,
  fileUrl: String,
  mimetype: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'rejected'],
    default: 'submitted',
  },
  reason: String,
});
const noteSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  createdAt: { type: Date, default: Date.now },
});
const workOrderSchema = new mongoose.Schema(
  {
    tenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', required: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    woNumber: { type: String, unique: true, index: true },
    contractRef: String,
    title: { type: String, required: true },
    description: { type: String, required: true },
    value: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    completionDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['issued', 'active', 'completed', 'cancelled'],
      default: 'active',
    },
    milestones: [milestoneSchema],
    vendorProofs: [proofSchema],
    attachments: [
      {
        filename: String,
        fileUrl: String,
        mimetype: String,
        size: Number,
        uploadedAt: Date,
      },
    ],
    pdfFile: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    completionReport: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    notes: [noteSchema],
    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
  },
  { timestamps: true }
);
module.exports = mongoose.model('WorkOrder', workOrderSchema);
