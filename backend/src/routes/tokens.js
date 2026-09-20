const express = require("express");
const router = express.Router();
const { db } = require("../firestore");
const { computeBaseTier, computeEffectiveTier, sortByPriority } = require("../priority");

// CUSTOMER ACTION: Walk-in — join the queue directly (e.g. after scanning
// the clinic's QR code). category: "general" | "senior" (vip is not
// self-selectable here — see note in README).
router.post("/", async (req, res) => {
  try {
    const { serviceId, userId, category = "general" } = req.body;
    if (!serviceId || !userId) {
      return res.status(400).json({ error: "serviceId and userId are required" });
    }
    if (!["general", "senior"].includes(category)) {
      return res.status(400).json({ error: "walk-in category must be general or senior" });
    }

    const baseTier = computeBaseTier({ category, type: "walkin" });
    const now = Date.now();

    const docRef = await db.collection("tokens").add({
      serviceId,
      userId,
      type: "walkin",
      category,
      baseTier,
      status: "waiting",
      counterId: null,
      queueEnteredAt: now,
      calledAt: null,
    });

    res.status(201).json({ id: docRef.id, message: "Joined queue", baseTier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LIST TOKENS (Used by staff dashboard for Live Queue and Overview)
// Supports optional ?status=waiting and ?serviceId=... query parameters.
router.get("/", async (req, res) => {
  try {
    const { status, serviceId } = req.query;
    let query = db.collection("tokens");
    if (status) {
      query = query.where("status", "==", status);
    }
    if (serviceId) {
      query = query.where("serviceId", "==", serviceId);
    }
    const snapshot = await query.get();
    const now = Date.now();
    const tokens = snapshot.docs.map((doc) => {
      const data = doc.data();
      const effectiveTier = computeEffectiveTier(data.baseTier, data.queueEnteredAt, now);
      const minutesWaited = Math.max(0, Math.floor((now - data.queueEnteredAt) / (60 * 1000)));
      return { id: doc.id, ...data, effectiveTier, minutesWaited };
    });

    // If status is waiting or unassigned, sort by priority engine
    const sorted = sortByPriority(tokens, now);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CUSTOMER ACTION: Get live position + ETA + effective tier for a token.
// Polled every few seconds from the frontend.
router.get("/:tokenId/status", async (req, res) => {
  try {
    const { tokenId } = req.params;
    const tokenDoc = await db.collection("tokens").doc(tokenId).get();
    if (!tokenDoc.exists) return res.status(404).json({ error: "Token not found" });
    const token = tokenDoc.data();

    if (token.status !== "waiting") {
      return res.json({ id: tokenId, ...token, position: 0, etaMins: 0, effectiveTier: null });
    }

    const serviceDoc = await db.collection("services").doc(token.serviceId).get();
    const avgServiceTimeMins = serviceDoc.exists ? serviceDoc.data().avgServiceTimeMins : 5;

    const waitingSnap = await db
      .collection("tokens")
      .where("serviceId", "==", token.serviceId)
      .where("status", "==", "waiting")
      .get();

    const waitingTokens = waitingSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const now = Date.now();
    const sorted = sortByPriority(waitingTokens, now);

    const position = sorted.findIndex((t) => t.id === tokenId);
    const etaMins = position * avgServiceTimeMins;
    const effectiveTier = computeEffectiveTier(token.baseTier, token.queueEnteredAt, now);

    res.json({ id: tokenId, ...token, position: position + 1, etaMins, effectiveTier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:tokenId/complete", async (req, res) => {
  try {
    const { tokenId } = req.params;
    const tokenDoc = await db.collection("tokens").doc(tokenId).get();
    if (!tokenDoc.exists) return res.status(404).json({ error: "Token not found" });
    const token = tokenDoc.data();

    await db.collection("tokens").doc(tokenId).update({ status: "completed" });
    if (token.counterId) {
      await db.collection("counters").doc(token.counterId).update({ currentTokenId: null });
    }
    // Also clear any counter holding this token
    const heldCounters = await db.collection("counters").where("currentTokenId", "==", tokenId).get();
    for (const cDoc of heldCounters.docs) {
      await cDoc.ref.update({ currentTokenId: null });
    }

    res.json({ message: "Token marked completed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:tokenId/no-show", async (req, res) => {
  try {
    const { tokenId } = req.params;
    const tokenDoc = await db.collection("tokens").doc(tokenId).get();
    if (!tokenDoc.exists) return res.status(404).json({ error: "Token not found" });
    const token = tokenDoc.data();

    await db.collection("tokens").doc(tokenId).update({ status: "no-show" });
    if (token.counterId) {
      await db.collection("counters").doc(token.counterId).update({ currentTokenId: null });
    }
    // Also clear any counter holding this token
    const heldCounters = await db.collection("counters").where("currentTokenId", "==", tokenId).get();
    for (const cDoc of heldCounters.docs) {
      await cDoc.ref.update({ currentTokenId: null });
    }

    res.json({ message: "Token marked as no-show" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
