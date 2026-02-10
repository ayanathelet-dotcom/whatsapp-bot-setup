import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function analyzeUserMessage(message) {

  const prompt = `
You are an AI assistant for a perfume store.

Tasks:
1. Detect user intent
2. Extract keywords
3. Decide searchType: keyword or embedding

Return ONLY JSON.

Intents:
product_search
recommendation
comparison
general_question

User message:
"${message}"

JSON:
{
  "intent": "",
  "keywords": [],
  "searchType": ""
}
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0
  });

  return JSON.parse(response.choices[0].message.content);
}
