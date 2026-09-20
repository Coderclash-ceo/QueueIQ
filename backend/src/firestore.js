// firestore.js
// Initializes Firebase Admin SDK and exports the Firestore db instance.
// Supports:
// 1. FIREBASE_SERVICE_ACCOUNT_KEY environment variable (for production deployment / Render)
// 2. Local serviceAccountKey.json (for local development)
// 3. GOOGLE_APPLICATION_CREDENTIALS

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

let credential;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const parsedKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    credential = admin.credential.cert(parsedKey);
  } catch (err) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY environment variable:", err.message);
  }
} else {
  const localKeyPath = path.join(__dirname, "../serviceAccountKey.json");
  const secretKeyPath = "/etc/secrets/serviceAccountKey.json";

  if (fs.existsSync(localKeyPath)) {
    const serviceAccount = require(localKeyPath);
    credential = admin.credential.cert(serviceAccount);
  } else if (fs.existsSync(secretKeyPath)) {
    const serviceAccount = require(secretKeyPath);
    credential = admin.credential.cert(serviceAccount);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    credential = admin.credential.applicationDefault();
  } else {
    console.warn("Warning: No Firebase credentials found. Provide FIREBASE_SERVICE_ACCOUNT_KEY or backend/serviceAccountKey.json.");
  }
}

if (!admin.apps.length) {
  admin.initializeApp(credential ? { credential } : {});
}

const db = admin.firestore();

module.exports = { admin, db };