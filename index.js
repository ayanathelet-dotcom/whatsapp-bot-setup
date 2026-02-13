import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";

import { products } from "./products.js";
import { analyzeUserMessage } from "./manage.js";
import { keywordSearch } from "./keywordSearch.js";
import { formatProductMessage } from "./replyformatter.js";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

/* ------------------ HEALTH CHECK ------------------ */

app.get("/", (req, res) => {
  res.send("WhatsApp AI Bot running 🚀");
});

/* ------------------ HUMAN-LIKE OPENING LINE ------------------ */

function getOpeningLine(intent) {
  const lines = [
    "Ohh that sounds like a really special gift 😊",
    "Nice choice — perfumes always make meaningful gifts ✨",
    "That’s thoughtful of you, I’d love to help with that 💫",
    "Great idea! Let me find something perfect for this occasion 🎁"
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

/* ------------------ SMART CLOSING LINE ------------------ */

function getClosingLine() {
  const lines = [
    "Tell me which one you like most, and I’ll help you get it quickly.",
    "Pick your favourite and I’ll guide you through the purchase.",
    "Let me know which one you’d like to buy and I’ll arrange the next step.",
    "Just reply with the perfume you like, and I’ll help you order it."
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

/* ------------------ WHATSAPP WEBHOOK ------------------ */

app.post("/whatsapp", async (req, res) => {
  try {
    const incomingMsg = req.body.Body || "";
    const userNumber = req.body.From;

    console.log("USER:", incomingMsg);

    /* 🧠 AI INTENT + KEYWORDS */
    const brain = await analyzeUserMessage(incomingMsg);
    console.log("BRAIN:", brain);

    const keywords = brain.keywords || [];

    /* 🔍 PRODUCT SEARCH */
    const results = keywordSearch(keywords, products).slice(0, 3);

    /* ❌ NO RESULTS */
    if (results.length === 0) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        body:
          "I couldn't find a perfect match yet 🤔\n\nTell me a bit more about the perfume you want — for whom or for which occasion?"
      });

      return res.send("<Response></Response>");
    }

    /* 🧠 SEND OPENING LINE */
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: userNumber,
      body: getOpeningLine(brain.intent)
    });

    /* 🖼 SEND PRODUCTS */
    for (const p of results) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        mediaUrl: [p.image],
        body: formatProductMessage(p)
      });
    }

    /* 🧠 SEND CLOSING LINE */
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: userNumber,
      body: getClosingLine()
    });

    res.send("<Response></Response>");

  } catch (err) {
    console.error("BOT ERROR:", err);

    res.send(
      "<Response><Message>Something went wrong. Please try again.</Message></Response>"
    );
  }
});

/* ------------------ START SERVER ------------------ */

app.listen(PORT, () => {
  console.log(`🤖 WhatsApp bot running on port ${PORT}`);
});
