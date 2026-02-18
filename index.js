// Load .env ONLY in local development
if (process.env.NODE_ENV !== "production") {
  await import("dotenv/config");
}

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

// ✅ Always trust Railway's port
const PORT = process.env.PORT || 3000;
console.log("ENV PORT:", PORT);


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

    /* 🔍 SEARCH PRODUCTS */
    const results = keywordSearch(keywords, products).slice(0, 3);

    /* ❌ NO RESULTS */
    if (results.length === 0) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        body:
          brain.language === "hindi"
            ? "Mujhe abhi perfect match nahi mila 🤔\nThoda aur batayein — kis ke liye ya kis occasion ke liye perfume chahiye?"
            : "I couldn't find the perfect match yet 🤔\nTell me a bit more — for whom or what occasion do you need the perfume?"
      });

      return res.send("<Response></Response>");
    }

    /* 🧠 SEND OPENING FIRST */
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: userNumber,
      body: brain.opening
    });

    /* 🖼 SEND PRODUCTS IN BETWEEN */
    for (const p of results) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        mediaUrl: [p.image],
        body: formatProductMessage(p)
      });
    }

    /* 🧠 SEND CLOSING LAST */
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: userNumber,
      body: brain.closing
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🤖 WhatsApp bot running on port ${PORT}`);
});
