import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

const ANALYZE_PROMPT =
  "Process the accompanying audio dictation and site photos (if provided). Clean up the audio transcription to have proper grammar and professional wording, but DO NOT add any outside analysis, assumptions, or new information. Output a JSON object with three keys: Transcription (the exact raw text of what was said), Observation (the cleaned-up, grammatically correct version of the dictation), and Action_And_Responsibility (extract any proposed actions and responsible trades mentioned, combined into one clear statement, or leave blank).";

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Photos and audio are sent as base64, so allow larger bodies than the default 100kb.
  app.use(express.json({ limit: "30mb" }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Gemini is called from the server so the API key is never sent to the browser.
  app.post("/api/analyze", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      return;
    }

    const { images, audio, audioMimeType } = req.body ?? {};
    if (typeof audio !== "string" || !audio) {
      res.status(400).json({ error: "Missing audio." });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const imageParts = (Array.isArray(images) ? images : [])
        .filter((img: unknown): img is string => typeof img === "string")
        .map((img) => ({ inlineData: { mimeType: "image/jpeg", data: img } }));

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: {
          parts: [
            ...imageParts,
            { inlineData: { mimeType: typeof audioMimeType === "string" && audioMimeType ? audioMimeType : "audio/webm", data: audio } },
            { text: ANALYZE_PROMPT },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              Transcription: { type: Type.STRING },
              Observation: { type: Type.STRING },
              Action_And_Responsibility: { type: Type.STRING },
            },
            required: ["Transcription", "Observation", "Action_And_Responsibility"],
          },
        },
      });

      if (!response.text) {
        res.status(502).json({ error: "Empty response from Gemini." });
        return;
      }
      res.json(JSON.parse(response.text));
    } catch (err) {
      console.error("Gemini request failed:", err);
      res.status(502).json({ error: "AI processing failed." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in development mode with Vite middleware");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in production mode");
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
