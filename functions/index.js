/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");


admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

app.post("/aops/create", async (req, res) => {
  try {
    const data = req.body;
    const mies = data.key_events.filter(ke => ke.mie).map(ke => ke.title);
    const aos = data.key_events.filter(ke => ke.adverse_outcome).map(ke => ke.title);

    if (!mies.length || !aos.length) {
      return res.status(400).json({ error: "Must include at least one MIE and one Adverse Outcome." });
    }

    const aop_id = `${mies[0].trim().toLowerCase().replace(/ /g, "_")}@${aos[0].trim().toLowerCase().replace(/ /g, "_")}`;
    data.aop_id = aop_id;

    const docRef = db.collection("aops").doc(aop_id);
    const doc = await docRef.get();
    if (doc.exists) {
      return res.status(400).json({ error: `AOP with ID '${aop_id}' already exists.` });
    }

    await docRef.set(data);
    res.status(200).json({ message: "AOP saved successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/aops", async (req, res) => {
  try {
    const snapshot = await db.collection("aops").get();
    const aops = snapshot.docs.map(doc => doc.data());
    res.json(aops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


exports.api = functions.https.onRequest(app);
