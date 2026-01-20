const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const User = require("../models/User");
const { sendEmail } = require("../utils/mailer");
const { generateOTP } = require("../utils/otp");

const router = express.Router();

/**
 * REGISTER
 * body: { email, password, otpMethod }
 * otpMethod: AUTHENTICATOR | EMAIL
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, otpMethod } = req.body;

    if (!email || !password || !otpMethod) {
      return res.status(400).json({ message: "Email, password, otpMethod required" });
    }

    if (!["AUTHENTICATOR", "EMAIL"].includes(otpMethod)) {
      return res.status(400).json({ message: "Invalid otpMethod" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const otp = generateOTP();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await User.create({
      email,
      passwordHash,
      otpMethod,
      status: "UNVERIFIED",
      emailVerified: false,
      emailVerifyOTP: otp,
      emailVerifyOTPExpires: expires,
    });

    // ✅ Send email verification OTP
    try {
      await sendEmail(
        email,
        "SecureAuth - Email Verification OTP",
        `Your Email Verification OTP is: ${otp}\n\nValid for 5 minutes.`
      );

      return res.json({
        message: "OTP sent to email",
        smtp: true,
      });
    } catch (err) {
      // fallback demo OTP
      if (err.message === "SMTP_NOT_CONFIGURED") {
        return res.json({
          message: "SMTP not configured, showing demo OTP",
          smtp: false,
          demoOtp: otp,
        });
      }

      console.error("OTP send failed:", err);
      return res.status(500).json({ message: "Failed to send OTP email" });
    }
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * VERIFY EMAIL OTP
 * body: { email, otp }
 */
router.post("/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.emailVerified) {
      return res.json({ message: "Email already verified" });
    }

    if (!user.emailVerifyOTP || !user.emailVerifyOTPExpires) {
      return res.status(400).json({ message: "No OTP pending" });
    }

    if (new Date() > user.emailVerifyOTPExpires) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (user.emailVerifyOTP !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.emailVerified = true;
    user.emailVerifyOTP = null;
    user.emailVerifyOTPExpires = null;

    // ✅ If EMAIL OTP method: ACTIVE immediately
    if (user.otpMethod === "EMAIL") {
      user.status = "ACTIVE";
      await user.save();

      return res.json({
        message: "Email verified. Account ACTIVE (Email OTP method).",
        next: "LOGIN",
      });
    }

    // ✅ AUTHENTICATOR method: must setup QR next
    await user.save();
    return res.json({
      message: "Email verified. Proceed to authenticator setup.",
      next: "SETUP_AUTHENTICATOR",
    });
  } catch (err) {
    console.error("Verify email error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * SETUP AUTHENTICATOR (generate secret + QR)
 * body: { email }
 */
router.post("/setup-authenticator", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.emailVerified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    if (user.otpMethod !== "AUTHENTICATOR") {
      return res.status(400).json({ message: "This account is not using Authenticator" });
    }

    const secret = speakeasy.generateSecret({
      name: `SecureAuth (${user.email})`,
    });

    user.totpSecret = secret.base32;
    await user.save();

    const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

    return res.json({
      message: "Scan QR in Google Authenticator",
      qrCodeDataURL,
    });
  } catch (err) {
    console.error("Setup authenticator error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * VERIFY AUTHENTICATOR OTP => ACTIVE
 * body: { email, token }
 */
router.post("/verify-authenticator", async (req, res) => {
  try {
    const { email, token } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.totpSecret) {
      return res.status(400).json({ message: "Authenticator not setup" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) return res.status(400).json({ message: "Invalid Authenticator OTP" });

    user.status = "ACTIVE";
    await user.save();

    return res.json({
      message: "Authenticator verified. Account ACTIVE.",
      next: "LOGIN",
    });
  } catch (err) {
    console.error("Verify authenticator error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * LOGIN STEP 1
 * body: { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(404).json({ message: "Invalid credentials" });

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        message: "Account not ACTIVE. Complete verification/2FA setup.",
      });
    }

    // ✅ Authenticator method: ask token in UI
    if (user.otpMethod === "AUTHENTICATOR") {
      return res.json({
        message: "Enter Authenticator OTP",
        method: "AUTHENTICATOR",
      });
    }

    // ✅ Email OTP method: send login OTP
    const otp = generateOTP();
    user.loginOTP = otp;
    user.loginOTPExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    try {
      await sendEmail(
        user.email,
        "SecureAuth - Login OTP",
        `Your Login OTP is: ${otp}\n\nValid for 5 minutes.`
      );

      return res.json({
        message: "Login OTP sent to email",
        method: "EMAIL",
        smtp: true,
      });
    } catch (err) {
      if (err.message === "SMTP_NOT_CONFIGURED") {
        return res.json({
          message: "SMTP not configured, showing demo OTP",
          method: "EMAIL",
          smtp: false,
          demoOtp: otp,
        });
      }

      console.error("Login OTP send failed:", err);
      return res.status(500).json({ message: "Failed to send login OTP" });
    }
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * LOGIN verify authenticator => JWT
 * body: { email, token }
 */
router.post("/login/verify-authenticator", async (req, res) => {
  try {
    const { email, token } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) return res.status(400).json({ message: "Invalid OTP" });

    const jwtToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({ token: jwtToken });
  } catch (err) {
    console.error("Verify auth login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * LOGIN verify email OTP => JWT
 * body: { email, otp }
 */
router.post("/login/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.loginOTP || !user.loginOTPExpires) {
      return res.status(400).json({ message: "No OTP pending" });
    }

    if (new Date() > user.loginOTPExpires) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (user.loginOTP !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.loginOTP = null;
    user.loginOTPExpires = null;
    await user.save();

    const jwtToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({ token: jwtToken });
  } catch (err) {
    console.error("Verify email login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
