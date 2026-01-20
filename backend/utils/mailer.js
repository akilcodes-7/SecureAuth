const nodemailer = require("nodemailer");

function smtpConfigured() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  return (
    user &&
    pass &&
    !user.includes("REPLACE_WITH") &&
    !pass.includes("REPLACE_WITH")
  );
}

function getTransporter() {
  if (!smtpConfigured()) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendEmail(to, subject, text) {
  const transporter = getTransporter();

  if (!transporter) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }

  // verify connection first
  await transporter.verify();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  });
}

module.exports = { sendEmail, smtpConfigured };
