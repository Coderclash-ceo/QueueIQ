const express = require("express");
const router = express.Router();
const { db } = require("../firestore");
const { computeBaseTier } = require("../priority");

// CUSTOMER ACTION: Book an appointment in advance for a future time.
// category defaults to "general". "vip" can only be set here by staff/admin
// during booking (e.g. a doctor-referred patient) — never self-selected by
// the customer on the public booking form. Enforce that at the UI level;
// the API trusts whatever the caller (staff dashboard vs customer form) sends.
router.post("/", async (req, res) => {
  try {
    const { serviceId, userId, appointmentTime, category = "general" } = req.body;
    if (!serviceId || !userId || !appointmentTime) {
      return res.status(400).json({ error: "serviceId, userId and appointmentTime are required" });
    }
    if (!["general", "senior", "vip"].includes(category)) {
      return res.status(400).json({ error: "invalid category" });
    }

    const docRef = await db.collection("appointments").add({
      serviceId,
      userId,
      category,
      appointmentTime, // epoch ms of the booked slot
      status: "scheduled", // scheduled -> checked-in -> (becomes a token)
      createdAt: Date.now(),
    });

    res.status(201).json({ id: docRef.id, message: "Appointment booked" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    let query = db.collection("appointments");
    if (req.query.status) {
      query = query.where("status", "==", req.query.status);
    } else if (req.query.all !== "true") {
      query = query.where("status", "==", "scheduled");
    }
    const snapshot = await query.get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CUSTOMER ACTION: Check in for a booked appointment (e.g. by scanning the
// clinic QR and entering their appointment ID, or arriving at the counter).
// This is what actually creates the active queue token — an appointment
// sitting in "scheduled" status does not occupy a queue position.
router.post("/:appointmentId/checkin", async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const apptDoc = await db.collection("appointments").doc(appointmentId).get();
    if (!apptDoc.exists) return res.status(404).json({ error: "Appointment not found" });
    const appt = apptDoc.data();

    if (appt.status !== "scheduled") {
      return res.status(400).json({ error: `Appointment already ${appt.status}` });
    }

    const baseTier = computeBaseTier({ category: appt.category, type: "appointment" });
    const now = Date.now();

    const tokenRef = await db.collection("tokens").add({
      serviceId: appt.serviceId,
      userId: appt.userId,
      type: "appointment",
      category: appt.category,
      baseTier,
      status: "waiting",
      counterId: null,
      queueEnteredAt: now, // aging clock starts at check-in, not at booking time
      appointmentTime: appt.appointmentTime,
      calledAt: null,
    });

    await db.collection("appointments").doc(appointmentId).update({ status: "checked-in" });

    res.status(201).json({ id: tokenRef.id, message: "Checked in, joined active queue", baseTier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
