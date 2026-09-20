const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { db } = require("./firestore");
const servicesRouter = require("./routes/services");
const countersRouter = require("./routes/counters");
const tokensRouter = require("./routes/tokens");
const appointmentsRouter = require("./routes/appointments");
const demoRouter = require("./routes/demo");

const app = express();

// Full CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());

app.use(express.json());

// Serve frontend static assets (HTML, CSS, JS) directly from Express
app.use(express.static(path.join(__dirname, "../../frontend")));

// Health check endpoint
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: Date.now() }));

// Root route serves customer portal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/customer.html"));
});

// Mount API routes
app.use("/services", servicesRouter);
app.use("/counters", countersRouter);
app.use("/tokens", tokensRouter);
app.use("/appointments", appointmentsRouter);
app.use("/demo", demoRouter);

// Auto-seed default services and counters with deterministic IDs so frontend and backend are always 100% in sync
async function ensureDefaultData() {
  try {
    const defaultServices = [
      { id: "dept_opd", name: "General OPD", avgServiceTimeMins: 10, icon: "🩺", desc: "Primary health consultations, routine checkups & prescriptions." },
      { id: "dept_peds", name: "Pediatrics", avgServiceTimeMins: 15, icon: "👶", desc: "Child care, vaccinations and developmental health assessments." },
      { id: "dept_derm", name: "Dermatology", avgServiceTimeMins: 15, icon: "🧴", desc: "Skin diseases, allergy screenings and cosmetic dermatology." },
      { id: "dept_cardio", name: "Cardiology", avgServiceTimeMins: 20, icon: "❤️", desc: "ECG reviews, cardiovascular checkups and hypertension care." },
      { id: "dept_ortho", name: "Orthopedics", avgServiceTimeMins: 15, icon: "🦴", desc: "Joint pain, bone injuries and mobility assessments." },
      { id: "dept_ent", name: "ENT Specialist", avgServiceTimeMins: 12, icon: "👂", desc: "Ear, nose and throat diagnostics and infection treatments." }
    ];

    for (const s of defaultServices) {
      const docRef = db.collection("services").doc(s.id);
      const doc = await docRef.get();
      if (!doc.exists) {
        await docRef.set({
          name: s.name,
          avgServiceTimeMins: s.avgServiceTimeMins,
          icon: s.icon,
          desc: s.desc,
          createdAt: Date.now()
        });
      }
    }
    console.log("Verified: Default clinic services initialized with deterministic IDs in Firestore.");

    // Also ensure at least default counters exist if none present
    const countersSnap = await db.collection("counters").get();
    if (countersSnap.empty) {
      await db.collection("counters").doc("counter_1").set({
        name: "Counter 1 (General OPD)",
        serviceId: "dept_opd",
        currentTokenId: null,
        createdAt: Date.now()
      });
      await db.collection("counters").doc("counter_2").set({
        name: "Counter 2 (Pediatrics)",
        serviceId: "dept_peds",
        currentTokenId: null,
        createdAt: Date.now()
      });
      console.log("Verified: Default service counters initialized in Firestore.");
    }
  } catch (err) {
    console.error("Initialization check note:", err.message);
  }
}

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`  SAQMS Backend Server running on http://localhost:${PORT}`);
  console.log(`  Patient Portal:  http://localhost:${PORT}/customer.html`);
  console.log(`  Staff Dashboard: http://localhost:${PORT}/staff.html`);
  console.log(`=======================================================`);
  await ensureDefaultData();
});

module.exports = { app, server };
