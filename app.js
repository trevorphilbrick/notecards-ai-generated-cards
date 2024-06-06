const express = require("express");
const multer = require("multer");
const pdf = require("pdf-parse");
const textract = require("textract");
const OpenAI = require("openai");
const { db } = require("./firebaseConfig");
const { doc, getDoc } = require("firebase/firestore");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "text/plain",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "multipart/form-data",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
    console.log("File is compatible");
  } else {
    cb(new Error("Unsupported file type"), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.post("/upload", upload.single("document"), async (req, res) => {
  console.log("endpoint hit");
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  try {
    let documentContent = "";

    if (req.file.mimetype === "application/pdf") {
      const data = await pdf(req.file.buffer);
      documentContent = data.text;
    } else {
      documentContent = await new Promise((resolve, reject) => {
        textract.fromBufferWithMime(
          req.file.mimetype,
          req.file.buffer,
          (error, text) => {
            if (error) reject(error);
            resolve(text);
          }
        );
      });
    }

    console.log("Document content:", documentContent);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Given the uploaded document, create a JSON array of objects, each object having a prompt and an answer in it. Document: \n\n${documentContent}`,
        },
      ],

      max_tokens: 1000,
      temperature: 0.5,
    });

    // Parsing the JSON from the content
    const rawContent = completion.choices[0].message.content;
    const cleanContent = rawContent.replace(/```json\n|\n```/g, "");
    const parsedContent = JSON.parse(cleanContent);

    res.json(parsedContent);
  } catch (error) {
    console.error("Error processing the file:", error);
    res.status(500).send("Failed to process the document.");
  }
});

app.get("/noteCardSets", async (req, res) => {
  const userId = req.query.userId;
  const setId = req.query.setId;

  if (!userId || !setId) {
    return res.status(400).send("Missing required parameters.");
  }

  try {
    const docRef = doc(db, "userCollections", userId);

    const docSnap = await getDoc(docRef);

    if (!docSnap.exists) {
      return res.status(404).send("Document not found.");
    }

    const { cardSets } = docSnap.data();

    console.log("Card sets:", cardSets);

    if (!cardSets) {
      return res.status(404).send("Card sets not found.");
    }

    const data = cardSets.find((set) => set.setId === setId);

    if (!data) {
      return res.status(404).send("Card set not found.");
    }

    res.json(data);
  } catch (error) {
    console.error("Error retrieving the document:", error);
    res.status(500).send("Failed to retrieve the document.");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
