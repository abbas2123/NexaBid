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
  filename: String,
  fileUrl: String,
  mimetype: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
});

const noteSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  createdAt: { type: Date, default: Date.now },
});

/* ================= MAIN WORK ORDER ================= */
const workOrderSchema = new mongoose.Schema(
  {
    /* Core Relations */
    tenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', required: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    /* Identification */
    woNumber: { type: String, unique: true, index: true },
    contractRef: String,

    /* Business Details */
    title: { type: String, required: true },
    description: { type: String, required: true },

    value: { type: Number, required: true }, // contract value
    paidAmount: { type: Number, default: 0 }, // auto increases on milestone approval

    startDate: { type: Date, required: true },
    completionDate: { type: Date, required: true },

    status: {
      type: String,
      enum: ['issued', 'active', 'completed', 'cancelled'],
      default: 'active',
    },

    /* Milestones & Proofs */
    milestones: [milestoneSchema],
    vendorProofs: [proofSchema],

    /* Attachments */
    attachments: [
      {
        filename: String,
        fileUrl: String,
        mimetype: String,
        size: Number,
        uploadedAt: Date,
      },
    ],

    /* Generated PDF */
    pdfFile: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },

    /* Notes */
    notes: [noteSchema],

    /* Auditing */
    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkOrder', workOrderSchema);
