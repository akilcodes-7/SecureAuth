const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, lowercase: true },

    // ✅ store only hashed password
    passwordHash: { type: String, required: true },

    // account status
    status: {
      type: String,
      enum: ["UNVERIFIED", "ACTIVE"],
      default: "UNVERIFIED",
    },

    emailVerified: { type: Boolean, default: false },

    // 2FA method chosen during signup
    otpMethod: {
      type: String,
      enum: ["AUTHENTICATOR", "EMAIL"],
      required: true,
    },

    // email verification OTP
    emailVerifyOTP: { type: String, default: null },
    emailVerifyOTPExpires: { type: Date, default: null },

    // email OTP for login
    loginOTP: { type: String, default: null },
    loginOTPExpires: { type: Date, default: null },

    // authenticator secret
    totpSecret: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
