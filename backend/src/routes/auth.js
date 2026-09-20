const express = require("express");
const router = express.Router();

// Pre-configured clinic roles for authentication
const STAFF_ACCOUNTS = {
  "1234": {
    name: "Dr. A. Sharma",
    role: "doctor",
    title: "Senior Consultant (OPD)",
    badge: "🩺 Doctor",
    allowedServices: ["dept_opd", "dept_peds"]
  },
  "5678": {
    name: "Dr. P. Nair",
    role: "doctor",
    title: "Pediatrics & Triage Specialist",
    badge: "👶 Specialist",
    allowedServices: ["dept_peds", "dept_cardio"]
  },
  "9999": {
    name: "Admin Desk",
    role: "admin",
    title: "Operations Supervisor",
    badge: "🛡️ Admin",
    allowedServices: ["*"]
  }
};

// Login with PIN or credentials
router.post("/login", (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: "PIN is required to authenticate" });
    }

    const account = STAFF_ACCOUNTS[pin];
    if (!account) {
      return res.status(401).json({
        error: "Invalid PIN. Use 1234 for Doctor or 9999 for Administrator."
      });
    }

    const sessionToken = `qiq_auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.json({
      success: true,
      message: "Authentication successful",
      token: sessionToken,
      user: account
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify active session token
router.get("/verify", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer qiq_auth_")) {
    return res.status(401).json({ valid: false, error: "Unauthorized session" });
  }
  res.json({ valid: true });
});

module.exports = router;
