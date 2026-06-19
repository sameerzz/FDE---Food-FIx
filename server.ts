import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Bypass self-signed SSL/TLS root CA rejections commonly encountered on Replit/container network boundary proxies
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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

    // Helper helper to fetch with sequential retries to withstand Replit cold-start sleeping
    const fetchWithRetry = async (url: string, opts: any, retries = 3, delay = 2000): Promise<Response> => {
      try {
        const response = await fetch(url, opts);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
      } catch (err: any) {
        if (retries > 0) {
          console.warn(`[API Proxy Retry] Let's reconnect/retry. Error: ${err.message}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return fetchWithRetry(url, opts, retries - 1, delay * 1.5);
        }
        throw err;
      }
    };

    console.log(`[Support API Request] Forwarding: "${userMessageContent}" to Replit backend.`);

    // Call Replit FoodFix Support Chat API
    const response = await fetchWithRetry(
      "https://a61d3ad9-46b1-4efc-b1c9-5f3d2b3804e6-00-diw155swjs5x.pike.replit.dev/api/support/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: userMessageContent })
      },
      3, // Number of retry attempts
      2500 // Inital wait milliseconds (increases exponentially if needed during cold starts)
    );

    const data = await response.json();
    return res.json({
      text: data.reply,
      escalated: !!data.escalated
    });

  } catch (error: any) {
    console.error("External support API routing error details:", error);
    res.status(500).json({ 
      error: `Failed to talk to the support database backend. Details: ${error.message || "Host connection timeout"}. This is commonly due to the Replit playground sleeping when inactive. Placing a web request has initiated a wakeup loop, please retry your message in a few seconds!` 
    });
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
