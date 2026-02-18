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

/* ------------------ WHATSAPP WEBHOOK ------------------ */

app.post("/whatsapp", async (req, res) => {
  try {

    const incomingMsg = req.body.Body || "";
    const userNumber = req.body.From;

    console.log("USER:", incomingMsg);

    /* 🧠 AI ANALYSIS */
    const brain = await analyzeUserMessage(incomingMsg);
    console.log("BRAIN:", brain);

    const keywords = brain.keywords || [];
    const openingLine = brain.openingLine || "Let me help you with that 🙂";
    const closingLine = brain.closingLine || "Tell me which one you like.";

    /* 🔍 PRODUCT SEARCH */
    const results = keywordSearch(keywords, products).slice(0, 3);

    /* ❌ NO RESULTS */
    if (results.length === 0) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        body: openingLine + "\n\nI couldn't find a perfect match yet 🤔\nTell me more about what you're looking for."
      });

      return res.send("<Response></Response>");
    }

    /* 🧠 SEND OPENING LINE (AI generated) */
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: userNumber,
      body: openingLine
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

    /* 🧠 SEND CLOSING LINE (AI generated) */
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: userNumber,
      body: closingLine
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
