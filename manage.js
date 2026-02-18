import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function analyzeUserMessage(message) {

  const prompt = `
You are an AI assistant for a premium perfume store.

Your job:
1. Detect user intent
2. Extract useful keywords for product search
3. Generate a warm, natural opening line
4. Generate a friendly closing line
5. Reply in SAME LANGUAGE as the user message

Tone:
• warm
• human
• premium
• helpful
• short (WhatsApp style)

Return ONLY valid JSON.

Intents:
product_search
recommendation
comparison
general_question

User message:
"${message}"

JSON format:
{
  "intent": "",
  "keywords": [],
  "openingLine": "",
  "closingLine": ""
}
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7
  });

  return JSON.parse(response.choices[0].message.content);
}
