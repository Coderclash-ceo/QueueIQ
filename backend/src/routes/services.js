const express = require("express");
const router = express.Router();
const { db } = require("../firestore");

router.post("/", async (req, res) => {
  try {
    const { name, avgServiceTimeMins } = req.body;
    if (!name || !avgServiceTimeMins) {
      return res.status(400).json({ error: "name and avgServiceTimeMins are required" });
    }
    const docRef = await db.collection("services").add({
      name,
      avgServiceTimeMins,
      createdAt: Date.now(),
    });
    res.status(201).json({ id: docRef.id, name, avgServiceTimeMins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("services").get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:serviceId", async (req, res) => {
  try {
    const { serviceId } = req.params;
    await db.collection("services").doc(serviceId).delete();
    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
