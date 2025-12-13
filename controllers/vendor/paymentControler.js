const Payment = require("../../models/payment");
const TenderParticipant = require("../../models/tenderParticipants");
const TenderBid = require("../../models/tenderBid");
const Tender = require("../../models/tender");

exports.initiateTenderPayment = async (req, res) => {
  try {
    const user = req.user;
    const tenderId = req.params.id;

    if (!user) return res.redirect('/login');

    const tender = await Tender.findById(tenderId);
    if (!tender) {
      return res.status(404).send("Tender not found");
    }
const existingPayment = await Payment.findOne({
      userId: user._id,
      status: "success",
      "metadata.tenderId": tenderId
    });

    if (existingPayment) {
      // Already paid → redirect directly
      return res.redirect(`/vendor/tender/${tenderId}/bid`);
    }
    // Store fees inside tender model OR define manually
    const participationFee = tender.participationFee ?? 500; // Example
    const emdFee = tender.emdFee ?? 5000; // Example

    const totalAmount = participationFee + emdFee;

    // Create pending payment record
    const payment = await Payment.create({
      userId: user._id,
      type: "participation_fee", // combined payment
      amount: totalAmount,
      gateway: "cash", // or temporary 'cash'
      status: "pending",
      metadata: {
        tenderId,
        participationPaid: true,
    emdPaid: true
      }
    });

    return res.render("vendor/paymentPage", {
      layout: "layouts/user/userLayout",
      tender,
      participationFee,
      emdFee,
      totalAmount,
      paymentId: payment._id
    });

  } catch (err) {
    console.log(err);
    return res.status(500).send("Server Error");
  }
};

exports.confirmCashPayment = async (req, res) => {
  try {
    const { paymentId } = req.body;
    const user = req.user;

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(400).send("Invalid Payment");

    payment.status = "success";
    payment.gatewayPaymentId = "CASH-" + Date.now();
    await payment.save();

    // Check participant first
    let participant = await TenderParticipant.findOne({
      tenderId: payment.metadata.tenderId,
      userId: user._id,
    });

    // If not exists, create
    if (!participant) {
      participant = await TenderParticipant.create({
        tenderId: payment.metadata.tenderId,
        userId: user._id,
        participationPaymentId: payment._id
      });
    }

    // Check Bid record as well
    let bid = await TenderBid.findOne({
      tenderId: payment.metadata.tenderId,
      vendorId: user._id,
    });

    if (!bid) {
      bid = await TenderBid.create({
        tenderId: payment.metadata.tenderId,
        vendorId: user._id,
        emdPaymentId: payment._id,
        status: "draft",
        auditTrail: [{
          action: "participation_paid",
          time: new Date(),
          byUser: user._id
        }]
      });
      bid.save()
    }

    return res.redirect(`/vendor/tender/${payment.metadata.tenderId}/bid?paid=true`);

  } catch (err) {
    console.log(err);
    return res.status(500).send("Payment Confirmation Failed");
  }
};