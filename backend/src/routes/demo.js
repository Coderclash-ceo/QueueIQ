const express = require("express");
const router = express.Router();
const { db } = require("../firestore");
const { computeBaseTier } = require("../priority");

// SEED DEMO DATA
// Seeds services, counters, tokens, and appointments with varying wait times
// to visually demonstrate priority tiers and the anti-starvation aging engine.
router.post("/seed", async (req, res) => {
  try {
    const now = Date.now();

    // 1. Services
    const serviceDefs = [
      { name: "General OPD", avgServiceTimeMins: 10 },
      { name: "Pediatrics", avgServiceTimeMins: 15 },
      { name: "Dermatology", avgServiceTimeMins: 15 },
      { name: "Cardiology", avgServiceTimeMins: 20 },
    ];

    const serviceMap = {};
    for (const s of serviceDefs) {
      // Check if exists
      const existing = await db.collection("services").where("name", "==", s.name).get();
      if (existing.empty) {
        const ref = await db.collection("services").add({ ...s, createdAt: now });
        serviceMap[s.name] = ref.id;
      } else {
        serviceMap[s.name] = existing.docs[0].id;
      }
    }

    const opdId = serviceMap["General OPD"];
    const pedsId = serviceMap["Pediatrics"];

    // 2. Counters
    const counterDefs = [
      { name: "Counter 1 (OPD)", serviceId: opdId },
      { name: "Counter 2 (OPD)", serviceId: opdId },
      { name: "Counter 3 (Pediatrics)", serviceId: pedsId },
    ];

    for (const c of counterDefs) {
      const existing = await db.collection("counters").where("name", "==", c.name).get();
      if (existing.empty) {
        await db.collection("counters").add({
          name: c.name,
          serviceId: c.serviceId,
          currentTokenId: null,
          createdAt: now,
        });
      }
    }

    // 3. Demo Tokens with different wait times to demonstrate aging
    // Token A: General walk-in waiting 12 minutes (Base 0 + 2 bumps = Effective 2)
    await db.collection("tokens").add({
      serviceId: opdId,
      userId: "Rahul Sharma",
      type: "walkin",
      category: "general",
      baseTier: 0,
      status: "waiting",
      counterId: null,
      queueEnteredAt: now - 12 * 60 * 1000, // 12 mins ago
      calledAt: null,
    });

    // Token B: Senior Citizen waiting 3 minutes (Base 2 + 0 bumps = Effective 2)
    await db.collection("tokens").add({
      serviceId: opdId,
      userId: "Mrs. Meena Patel",
      type: "walkin",
      category: "senior",
      baseTier: 2,
      status: "waiting",
      counterId: null,
      queueEnteredAt: now - 3 * 60 * 1000, // 3 mins ago
      calledAt: null,
    });

    // Token C: Staff-referred VIP waiting 1 minute (Base 3 = Effective 3)
    await db.collection("tokens").add({
      serviceId: opdId,
      userId: "Dr. Vikram Seth (VIP / ER Transfer)",
      type: "appointment",
      category: "vip",
      baseTier: 3,
      status: "waiting",
      counterId: null,
      queueEnteredAt: now - 1 * 60 * 1000, // 1 min ago
      calledAt: null,
    });

    // Token D: Appointment holder checked-in 7 minutes ago (Base 1 + 1 bump = Effective 2)
    await db.collection("tokens").add({
      serviceId: opdId,
      userId: "Ananya Roy",
      type: "appointment",
      category: "general",
      baseTier: 1,
      status: "waiting",
      counterId: null,
      queueEnteredAt: now - 7 * 60 * 1000, // 7 mins ago
      calledAt: null,
    });

    // 4. Scheduled Appointments (not yet checked-in)
    await db.collection("appointments").add({
      serviceId: opdId,
      userId: "Kavita Rao",
      category: "general",
      appointmentTime: now + 30 * 60 * 1000,
      status: "scheduled",
      createdAt: now,
    });

    await db.collection("appointments").add({
      serviceId: opdId,
      userId: "Col. Suresh Verma",
      category: "senior",
      appointmentTime: now + 60 * 60 * 1000,
      status: "scheduled",
      createdAt: now,
    });

    res.json({ message: "Clinic demo data seeded successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESET ALL QUEUE TOKENS & APPOINTMENTS (keeps services and counters)
router.post("/clear-queue", async (req, res) => {
  try {
    const tokens = await db.collection("tokens").get();
    for (const doc of tokens.docs) {
      await doc.ref.delete();
    }

    const appts = await db.collection("appointments").get();
    for (const doc of appts.docs) {
      await doc.ref.delete();
    }

    // Reset counters currentTokenId
    const counters = await db.collection("counters").get();
    for (const doc of counters.docs) {
      await doc.ref.update({ currentTokenId: null });
    }

    res.json({ message: "Queue tokens and appointments cleared." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
