const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// 🔐 PROTECTED ROUTE — MIDDLEWARE IS MANDATORY
router.get("/", authMiddleware, (req, res) => {
  res.json({
    message: "You accessed a protected route",
    userId: req.userId,
  });
});

module.exports = router;
