

require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log("Key loaded:", GEMINI_API_KEY ? GEMINI_API_KEY.slice(0, 6) + "..." + GEMINI_API_KEY.length : "NOTHING FOUND");


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

app.use(express.json());

app.use(express.static(path.join(__dirname, "public", "landing")));
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "landing", "index.html"));
});

// ----  extract text from the uploaded PDF ----
app.post("/api/extract", upload.single("paper"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded." });
    }
    const data = await pdfParse(req.file.buffer);
    const text = data.text.trim();

    if (!text) {
      return res.status(422).json({
        error: "No readable text was found in this PDF (it may be a scanned image).",
      });
    }

    res.json({ text, pages: data.numpages });
  } catch (err) {
    console.error("Extraction error:", err);
    res.status(500).json({ error: "Could not read that PDF. Please try a different file." });
  }
});

// ---- turn extracted text into a chapter-based story via Gemini ----
app.post("/api/generate-story", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "No paper text was provided." });
    }
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Server is missing a Gemini API key. Add one to your .env file.",
      });
    }

    
    const trimmed = text.slice(0, 30000);

    const prompt = `You are a science storyteller. Turn the research paper text below into an
engaging, easy-to-understand STORY told in plain language for a curious general reader —
narrative and vivid, not a dry summary, but still accurate to what the paper actually says.

Break the story into chapters. Always include the ideas behind: an introduction/setup,
the abstract's core idea, relevant background/prior work, what the researchers actually did
(methodology), what they found (results), and what it means (conclusion) — but you decide
the exact chapter titles and how many chapters there are (at least 5, no more than 9),
and you may add extra chapters if the paper calls for it.

Respond with ONLY valid JSON, no markdown fences, no commentary, in exactly this shape:
{
  "storyTitle": "a short, evocative title for the whole story",
  "chapters": [
    { "title": "Chapter title", "content": "2-4 paragraphs of story text for this chapter" }
  ]
}

PAPER TEXT:
"""${trimmed}"""`;

   let response;

for (let attempt = 1; attempt <= 3; attempt++) {
  response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (response.ok) break;

  if (response.status === 503 && attempt < 3) {
    console.log(`Gemini is busy. Retrying (${attempt}/3)...`);
    await new Promise(resolve => setTimeout(resolve, attempt * 3000));
  } else {
    break;
  }
}

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Gemini error:", errBody);
      return res.status(502).json({ error: "The AI service did not respond. Please try again." });
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return res.status(502).json({ error: "The AI returned an empty response." });
    }

    let story;
    try {
      story = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: "The AI response could not be understood as a story." });
    }

    res.json(story);
  } catch (err) {
    console.error("Story generation error:", err);
    res.status(500).json({ error: "Something went wrong while generating the story." });
  }
});

app.listen(PORT, () => {
  console.log(`Narata is running: http://localhost:${PORT}`);
});
