const express = require("express");
const multer = require("multer");
const pdf = require("pdf-parse");
const textract = require("textract");
const OpenAI = require("openai");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "text/plain",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

app.post("/upload", upload.single("document"), async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
