import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const isQuotaOrAuthError = (error: any): boolean => {
  const msg = (typeof error === 'string' ? error : (error?.message || JSON.stringify(error) || "")).toLowerCase();
  return (
    error?.status === 429 ||
    error?.status === 403 ||
    error?.status === 401 ||
    error?.error?.code === 429 ||
    error?.error?.code === 403 ||
    error?.error?.code === 401 ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate') ||
    msg.includes('429') ||
    msg.includes('exceeded') ||
    msg.includes('unauthenticated') ||
    msg.includes('permission') ||
    msg.includes('invalid authentication')
  );
};

// Helper to normalize various date formats to ISO YYYY-MM-DD
function normalizeToIsoDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (['n/a', 'none', 'unknown', 'null', 'undefined', '-'].includes(trimmed.toLowerCase())) return '';
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  
  const parts = trimmed.split(/[\/\-\.\s]+/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (parts[2].length === 4) {
      const y = parts[2];
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      let m = p1;
      let d = p0;
      if (p0 <= 12 && p1 > 12) {
        m = p0;
        d = p1;
      }
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return d.toISOString().split('T')[0];
  }
  return '';
}

const generateContentWithRetry = async (ai: any, primaryModel: string, params: any) => {
  // Valid, modern, high-capacity models queue according to current Gemini SDK guidelines.
  const modelQueue = Array.from(new Set([primaryModel, 'gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'])).filter(Boolean);
  let lastError: any = null;

  for (const model of modelQueue) {
    try {
      const { model: _, ...restParams } = params;
      return await ai.models.generateContent({ ...restParams, model });
    } catch (error: any) {
      lastError = error;
      const msg = (error?.message || (typeof error === 'string' ? error : JSON.stringify(error) || '')).toLowerCase();
      const isBusy = error?.status === 503 || msg.includes('503') || msg.includes('unavailable') || msg.includes('high demand') || msg.includes('overloaded');
      const isRateLimit = isQuotaOrAuthError(error);

      if (isBusy) {
        console.warn(`Model ${model} is experiencing high demand (503). Instantly switching to fallback model...`);
        continue;
      }

      if (isRateLimit) {
        console.warn(`Model ${model} rate limited or quota error. Trying fallback model...`);
        continue;
      }

      continue;
    }
  }
  throw lastError || new Error("AI service is currently experiencing high demand. Please try again in a moment.");
};

async function startServer() {
  const app = express();
  const PORT = Number.parseInt(process.env.PORT || "8080", 10);

  // CORS middleware for Android APK and web clients
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/parse-receipt", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image || !mimeType) {
        return res.status(400).json({ error: "Image data and mimeType are required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(401).json({ error: "API key is missing on the server. Please configure GEMINI_API_KEY." });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await generateContentWithRetry(ai, 'gemini-2.5-flash', {
        contents: [
          {
            text: "Extract receipt or bank statement details: the total amount (as a number), the recipient or sender name, date of transaction (YYYY-MM-DD), time if available (HH:mm AM/PM), payment method used (e.g. Cash, Card, M-PESA, Bank Transfer), and a reference number if present. Also determine if this transaction is 'income' (money received/added to account) or 'expense' (money spent/deducted). If it's a receipt with itemized purchases, extract a list of purchased items (name and amount). If something is missing, leave it empty or 0 for amount."
          },
          {
            inlineData: {
              data: image,
              mimeType: mimeType
            }
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, description: "Total amount in numbers" },
              recipient: { type: Type.STRING, description: "Name of the store, person, recipient, or sender" },
              date: { type: Type.STRING, description: "Date of transaction in YYYY-MM-DD" },
              time: { type: Type.STRING, description: "Time of transaction" },
              paymentMethod: { type: Type.STRING, description: "Method of payment e.g. Cash, Card, M-PESA" },
              reference: { type: Type.STRING, description: "Receipt or reference number" },
              type: { type: Type.STRING, description: "Either 'income' or 'expense'" },
              purchasedItems: {
                type: Type.ARRAY,
                description: "List of itemized purchases, if available",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Name of the item" },
                    amount: { type: Type.NUMBER, description: "Price or amount of the item" }
                  }
                }
              }
            }
          }
        }
      });

      const text = response.text || "{}";
      const data = JSON.parse(text);
      if (data.date) {
        data.date = normalizeToIsoDate(data.date);
      }
      res.json(data);
    } catch (error: any) {
      if (isQuotaOrAuthError(error)) {
        return res.status(401).json({ error: "API limit or permission error. Please verify your GEMINI_API_KEY." });
      }
      console.error("Gemini parse error:", error);
      res.status(500).json({ error: error.message || "Failed to parse receipt" });
    }
  });

  app.post("/api/scan-document", async (req, res) => {
    try {
      const { image, mimeType, supportedTypes } = req.body;
      if (!image || !mimeType) {
        return res.status(400).json({ error: "Image data and mimeType are required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(401).json({ error: "API key is missing on the server. Please configure GEMINI_API_KEY." });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const typesList = supportedTypes || "National ID, Passport, Drivers License, Medical Insurance, Hospital Card, KRA PIN, Vehicle Insurance, Employment Card, Students Card, Shopping Card, Business License, Tax Certificate, Birth Certificate, Contract, Incorporation Certificate";

      const response = await generateContentWithRetry(ai, 'gemini-2.5-flash', {
        contents: [
          {
            text: `You are a world-class document OCR and structured data extraction engine. Carefully inspect the provided document image (ID, Passport, License, Card, Certificate, Tax Record, or Official Document).

Extract the following key fields accurately:
1. "documentType": Classify using one of these values: [${typesList}]. If it is a different document, provide a short title-cased descriptive category name (e.g. "Work Permit", "Residence Card").
2. "documentNumber": The primary document number, ID number, passport number, license ID, PIN code, or registration number. Cleanly remove prefixes like 'No.', 'ID:', 'DL:', 'PASSPORT NO.'.
3. "expiryDate": The expiration / valid-until date. Strictly normalize to ISO format YYYY-MM-DD (e.g. 2028-09-30). If no expiration date exists or it is not visible, return "".
4. "issueDate": The date of issue / date issued / valid-from date. Strictly normalize to ISO format YYYY-MM-DD. If not visible, return "".
5. "fullName": The full legal name of the cardholder/owner as printed on the document. Return "" if not visible.
6. "suggestedTags": 2 to 3 short relevant tags for organizing this document (e.g., ["National ID", "Identification"], ["Passport", "Travel"], ["Vehicle", "License"]).`
          },
          {
            inlineData: {
              data: image,
              mimeType: mimeType
            }
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              documentType: { type: Type.STRING },
              documentNumber: { type: Type.STRING },
              expiryDate: { type: Type.STRING },
              issueDate: { type: Type.STRING },
              fullName: { type: Type.STRING },
              suggestedTags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          }
        }
      });

      const text = response.text || "{}";
      const data = JSON.parse(text);
      
      if (data.expiryDate) {
        data.expiryDate = normalizeToIsoDate(data.expiryDate);
      }
      if (data.issueDate) {
        data.issueDate = normalizeToIsoDate(data.issueDate);
      }
      if (data.documentNumber && ['n/a', 'none', 'null', 'unknown', '-'].includes(data.documentNumber.toLowerCase().trim())) {
        data.documentNumber = "";
      }
      if (data.fullName && ['n/a', 'none', 'null', 'unknown', '-'].includes(data.fullName.toLowerCase().trim())) {
        data.fullName = "";
      }
      if (data.documentType && ['n/a', 'none', 'null', 'unknown', '-'].includes(data.documentType.toLowerCase().trim())) {
        data.documentType = "";
      }

      res.json(data);
    } catch (error: any) {
      if (isQuotaOrAuthError(error)) {
        return res.status(401).json({ error: "API limit or permission error. Please verify your GEMINI_API_KEY." });
      }
      console.error("Gemini document scan error:", error);
      res.status(500).json({ error: error.message || "Failed to scan document" });
    }
  });

  app.post("/api/discover-socials", async (req, res) => {
    try {
      const { email, name } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(401).json({ error: "API key is missing on the server. Please configure GEMINI_API_KEY." });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });
      
      const searchQuery = `${name} ${email || ''}`.trim();

      let response;
      try {
        response = await generateContentWithRetry(ai, 'gemini-2.5-flash', {
          model: 'gemini-2.5-flash',
          contents: `Find public social media profile URLs and a public email address for "${searchQuery}". 
                     Look for LinkedIn, Twitter (X), GitHub, Instagram, Facebook, TikTok, SoundCloud, YouTube, and a personal Website.
                     Return ONLY a valid JSON object with keys: "linkedin", "twitter", "github", "instagram", "facebook", "website", "tiktok", "soundcloud", "youtube", "email".
                     Values should be the full URL. If not found, use null.`,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json'
          }
        });
      } catch (searchError: any) {
        if (isQuotaOrAuthError(searchError)) {
          // Fallback without search
          response = await generateContentWithRetry(ai, 'gemini-2.5-flash', {
            model: 'gemini-2.5-flash',
            contents: `Find public social media profile URLs and a public email address for "${searchQuery}". 
                       Look for LinkedIn, Twitter (X), GitHub, Instagram, Facebook, TikTok, SoundCloud, YouTube, and a personal Website.
                       Return ONLY a valid JSON object with keys: "linkedin", "twitter", "github", "instagram", "facebook", "website", "tiktok", "soundcloud", "youtube", "email".
                       Values should be the full URL. If not found, use null.`,
            config: {
              responseMimeType: 'application/json'
            }
          });
        } else {
          throw searchError;
        }
      }

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = chunks
        ? chunks.map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null).filter(Boolean)
        : [];

      const data = JSON.parse(response.text || '{}');
      res.json({ data, sources });
    } catch (error: any) {
      if (isQuotaOrAuthError(error)) {
        return res.status(401).json({ error: "API limit or permission error. Please verify your GEMINI_API_KEY." });
      }
      console.error("Gemini discover error:", error);
      let errMsg = "Failed to discover socials";
      if (error?.message) {
        errMsg = error.message;
      }
      res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/analyze-finances", async (req, res) => {
    try {
      const { query, contextData } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(401).json({ error: "API key is missing on the server. Please configure GEMINI_API_KEY." });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await generateContentWithRetry(ai, 'gemini-2.5-flash', {
        model: 'gemini-2.5-flash',
        contents: `You are a financial AI assistant.
Here are the user's transaction records (both income and expenses): ${JSON.stringify(contextData || [])}.

User Question: "${query}"

Task: Answer the user's question based strictly on the provided financial records. 
Help them understand where they spend the most, their income sources, frequent transactions, etc.
Be concise, analytical, and helpful. Do not use markdown headers larger than h3.`
      });

      res.json({ answer: response.text || "No analysis available." });
    } catch (error: any) {
      if (isQuotaOrAuthError(error)) {
        return res.status(401).json({ error: "API limit or permission error. Please verify your GEMINI_API_KEY." });
      }
      console.error("Gemini finances error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze finances" });
    }
  });

  app.post("/api/analyze-journal", async (req, res) => {
    try {
      const { query, contextData } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(401).json({ error: "API key is missing on the server. Please configure GEMINI_API_KEY." });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await generateContentWithRetry(ai, 'gemini-2.5-flash', {
        model: 'gemini-2.5-flash',
        contents: `You are a personal journal assistant.
Here are the user's journal entries: ${JSON.stringify(contextData || [])}.

User Question: "${query}"

Task: Answer the user's question based strictly on the provided journal entries. 
If the user asks to "retrieve" something, summarize it. 
Always mention the date of the entry you are referencing.
Keep it concise and helpful.`
      });

      res.json({ answer: response.text || "No insights found." });
    } catch (error: any) {
      if (isQuotaOrAuthError(error)) {
        return res.status(401).json({ error: "API limit or permission error. Please verify your GEMINI_API_KEY." });
      }
      console.error("Gemini journal error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze journal" });
    }
  });

  app.post("/api/wallet-voice", async (req, res) => {
    try {
      const { audio, mimeType } = req.body;
      if (!audio) {
        return res.status(400).json({ error: "Audio data is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(401).json({ error: "API key is missing on the server. Please configure GEMINI_API_KEY." });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await generateContentWithRetry(ai, 'gemini-2.5-flash', {
        model: 'gemini-2.5-flash',
        contents: [
          { inlineData: { mimeType: mimeType || 'audio/webm', data: audio } },
          { text: "Listen to the user. If they say 'Hey Wallet' AND ask to scan, extract, or read the document details, return JSON { action: 'SCAN' }. Otherwise return { action: 'NONE' }." }
        ],
        config: { responseMimeType: 'application/json' }
      });

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (error: any) {
      if (isQuotaOrAuthError(error)) {
        return res.status(401).json({ error: "API limit or permission error. Please verify your GEMINI_API_KEY." });
      }
      console.error("Gemini voice error:", error);
      res.status(500).json({ error: error.message || "Failed to process voice" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on 0.0.0.0:${PORT}`);
  });
}

startServer();
