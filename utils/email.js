const nodemailer = require('nodemailer');
const { withTimeout } = require('./promiseUtils');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendOtpEmail = async (email, otp) => {
  await withTimeout(
    transporter.sendMail({
      from: `"NexaBid" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'NexaBid OTP Verification',
      html: `<center>
            <h2>Your OTP Code 🔐</h2>
            <h1 style="letter-spacing: 5px;">${otp}</h1>
            <p>This OTP is valid for 4 minutes.</p>
          </center>`,
    }),
    10000,
    'Email Timeout'
  );
};

exports.sendMailUser = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  await withTimeout(
    transporter.sendMail({
      from: `NexaBid <${process.env.EMAIL_USER}`,
      to,
      subject,
      html,
    }),
    10000,
    'Email Timeout'
  );
};
