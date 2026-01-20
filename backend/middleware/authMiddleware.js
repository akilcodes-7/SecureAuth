const jwt = require("jsonwebtoken");
const BlacklistedToken = require("../models/BlacklistedToken");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // 🔒 Check blacklist (logout protection)
    const blacklisted = await BlacklistedToken.findOne({ token });
    if (blacklisted) {
      return res.status(401).json({ message: "Token has been revoked" });
    }

    // 🔐 Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Keep it simple for route handlers
    req.userId = decoded.userId;
    next();

  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
