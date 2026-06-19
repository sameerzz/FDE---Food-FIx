import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up body parsers (limit to 20mb for base64 image uploads)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Initialize Gemini SDK with User-Agent heading - prioritize GOOGLE_API_KEY first as requested
const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// Endpoint: Healthcheck and system context status
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    geminiEnabled: !!ai,
    environment: process.env.NODE_ENV || "development",
  });
});

// Endpoint: Process user customer support messages
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format. Expected list of messages." });
    }

    // Extrapolate the most recent user text query to forward to the single-message Replit API
    const userMessages = messages.filter((msg: any) => msg.type === "user");
    const lastUserMsg = userMessages[userMessages.length - 1];
    const userMessageContent = lastUserMsg?.text || "Hello";

    // Call Replit FoodFix Support Chat API
    const response = await fetch("https://a61d3ad9-46b1-4efc-b1c9-5f3d2b3804e6-00-diw155swjs5x.pike.replit.dev/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: userMessageContent })
    });

    if (!response.ok) {
      throw new Error(`External support API returned status: ${response.status}`);
    }

    const data = await response.json();
    return res.json({
      text: data.reply,
      escalated: !!data.escalated
    });

  } catch (error: any) {
    console.error("External support API routing error:", error);
    res.status(500).json({ error: error.message || "Something went wrong contact support API." });
  }
});

// Start integration and listen
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
