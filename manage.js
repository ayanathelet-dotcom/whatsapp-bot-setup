import Groq from "groq-sdk";

/* ------------------ LAZY INITIALIZATION ------------------ */
let groq = null;

function getGroqClient() {
  if (!groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is missing in environment variables");
    }

    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }
  return groq;
}

/* ------------------ SAFE JSON PARSER ------------------ */
function safeJSONParse(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("❌ JSON PARSE ERROR:", text);
    return null;
  }
}

/* ------------------ MAIN FUNCTION ------------------ */

export async function analyzeUserMessage(message) {
  try {
    const client = getGroqClient();

    const prompt = `
You are a smart WhatsApp perfume shopping assistant.

Your job:
1. Detect user intent
2. Extract  keywords for product search
3. Detect user's language (English / Hinglish / Hindi)
4. Generate a SHORT opening message (max 1–2 lines)
5. Generate a SHORT closing message with a coupon

IMPORTANT RULES:
- Reply in SAME language as user
- Tone: casual, friendly, human (like WhatsApp chat)
- Opening MUST be 1–2 short lines only
- NO long paragraphs, NO explanations
- Keep it crisp and natural
- Keywords must be relevant (gender, occasion, mood, relationship etc.)

COUPON RULE:
Closing message MUST include this offer:
"Apply code FIRST10 and get 10% off on your first order"

Translate the coupon message into user's language naturally.

Return ONLY valid JSON:

{
  "intent": "",
  "keywords": [],
  "language": "",
  "opening": "",
  "closing": ""
}

User message:
"${message}"
`;

    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3 // 🔥 lower = more controlled
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from Groq");
    }

    const parsed = safeJSONParse(content);

    if (!parsed) {
      throw new Error("Invalid JSON from AI");
    }

    /* ------------------ HARD LIMIT SAFETY ------------------ */


    // Fallback safety
    return {
      intent: parsed.intent || "unknown",
      keywords: parsed.keywords || [],
      language: parsed.language || "english",
      opening: parsed.opening || "Let me show you some options ✨",
      closing:
        parsed.closing ||
        "Use code FIRST10 & get 10% off on your first order 😉"
    };

  } catch (err) {
    console.error("❌ GROQ ERROR:", err);

    return {
      intent: "unknown",
      keywords: [],
      language: "english",
      opening: "Let me show you some great perfumes ✨",
      closing: "Use code FIRST10 & get 10% off on your first order 😉"
    };
  }
}