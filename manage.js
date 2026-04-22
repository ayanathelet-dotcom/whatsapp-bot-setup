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

/* ------------------ MAIN FUNCTION ------------------ */

export async function analyzeUserMessage(message) {
  try {
    const client = getGroqClient();

    const prompt = `
You are an AI assistant for a perfume store.

Your job:
1. Detect user intent
2. Extract keywords for product search
3. Detect language of user
4. Generate a warm OPENING line introducing recommendations
5. Generate a natural CLOSING line encouraging action

IMPORTANT:
- Reply in SAME language as user
- Tone must be friendly, warm, human
- Opening must smoothly introduce product suggestions
- Closing must encourage purchase or refinement

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
      temperature: 0.4
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from Groq");
    }

    return JSON.parse(content);

  } catch (err) {
    console.error("❌ GROQ ERROR:", err);

    // fallback so bot never crashes
    return {
      intent: "unknown",
      keywords: [],
      language: "english",
      opening: "Let me show you some great perfumes ✨",
      closing: "Tell me your preference and I’ll help you better 😊"
    };
  }
}