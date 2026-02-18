import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function analyzeUserMessage(message) {

  const prompt = `
You are an AI assistant for a perfume store.

Your job:
1. Detect user intent
2. Extract keywords for product search
3. Detect the language of the user
4. Generate a short warm OPENING line that clearly introduces recommendations
5. Generate a natural CLOSING line inviting next action

IMPORTANT:
- Reply in SAME language as user
- Tone must be friendly, warm, human
- Opening must clearly lead into product suggestions
- Closing must encourage purchase or refinement

Return ONLY JSON in this format:

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

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4
  });

  return JSON.parse(response.choices[0].message.content);
}
