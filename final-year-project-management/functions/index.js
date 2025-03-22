const functions = require("firebase-functions");
const admin = require("firebase-admin");
const csv = require("csv-parser");
const {Readable} = require("stream");

admin.initializeApp();
const db = admin.firestore();

exports.processCSV = functions.https.onRequest(async (req, res) => {
  try {
    const csvData = req.body.csvData; // Use req.body instead of data from onCall
    if (!csvData) {
      return res.status(400).json({error: "CSV data is required"});
    }

    const results = [];
    const stream = Readable.from(csvData);

    stream.pipe(csv())
        .on("data", (row) => {
          results.push(row);
        })
        .on("end", async () => {
        // Process data in batches to avoid exceeding Firestore limits
          const batchSize = 500; // Firestore batch limit
          for (let i = 0; i < results.length; i += batchSize) {
            const batch = db.batch();
            const batchResults = results.slice(i, i + batchSize);

            batchResults.forEach((row) => {
              const docRef = db.collection("students").doc();
              batch.set(docRef, row);
            });

            await batch.commit();
          }
          res.status(200).json({message: "CSV data processed successfully"});
        });
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

exports.allocateSupervisorsModerators = functions.https.onRequest(async (req, res) => {
  res.json({message: "Allocation process completed successfully"});
});
