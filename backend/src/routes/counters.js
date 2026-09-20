const express = require("express");
const router = express.Router();
const { db } = require("../firestore");
const { sortByPriority } = require("../priority");

router.post("/", async (req, res) => {
  try {
    const { name, serviceId } = req.body;
    if (!name || !serviceId) {
      return res.status(400).json({ error: "name and serviceId are required" });
    }
    const docRef = await db.collection("counters").add({
      name,
      serviceId,
      currentTokenId: null,
      createdAt: Date.now(),
    });
    res.status(201).json({ id: docRef.id, name, serviceId, currentTokenId: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("counters").get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// STAFF ACTION: Call the next customer for this counter's service.
// Uses effective-tier sort (base tier + aging) instead of plain FIFO or a
// single static priority flag — this is the core queue engine.
router.patch("/:counterId/call-next", async (req, res) => {
  try {
    const { counterId } = req.params;
    const counterDoc = await db.collection("counters").doc(counterId).get();
    if (!counterDoc.exists) return res.status(404).json({ error: "Counter not found" });
    const counter = counterDoc.data();

    const waitingSnap = await db
      .collection("tokens")
      .where("serviceId", "==", counter.serviceId)
      .where("status", "==", "waiting")
      .get();

    if (waitingSnap.empty) {
      return res.status(200).json({ message: "No customers waiting" });
    }

    const waitingTokens = waitingSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const sorted = sortByPriority(waitingTokens);
    const nextToken = sorted[0];

    await db.collection("tokens").doc(nextToken.id).update({
      status: "called",
      counterId,
      calledAt: Date.now(),
    });
    await db.collection("counters").doc(counterId).update({
      currentTokenId: nextToken.id,
    });

    res.json({ message: "Next token called", token: { ...nextToken, status: "called" } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:counterId", async (req, res) => {
  try {
    const { counterId } = req.params;
    await db.collection("counters").doc(counterId).delete();
    res.json({ message: "Counter deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
