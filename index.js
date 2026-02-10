import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";

import { products } from "./products.js";
import { analyzeUserMessage } from "./manage.js";
import { keywordSearch } from "./keywordSearch.js";
import {
  formatNoResultsReply,
  formatProductMessage
} from "./replyformatter.js";

/* ------------------ TWILIO CLIENT ------------------ */

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/* ------------------ APP SETUP ------------------ */

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

/* ------------------ HEALTH CHECK ------------------ */

app.get("/", (req, res) => {
  res.send("WhatsApp AI Bot is running 🚀");
});

/* ------------------ WHATSAPP WEBHOOK ------------------ */

app.post("/whatsapp", async (req, res) => {
  try {
    const incomingMsg = req.body.Body || "";
    const userNumber = req.body.From; // whatsapp:+91XXXXXXXXXX

    console.log("USER:", incomingMsg);

    // 🧠 Analyze user intent
    const brain = await analyzeUserMessage(incomingMsg);
    console.log("BRAIN:", brain);

    // 🔍 Search products locally
    const results = keywordSearch(brain.keywords, products).slice(0, 3);

    // ❌ No results
    if (results.length === 0) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        body: formatNoResultsReply()
      });

      return res.send("<Response></Response>");
    }

    // 🖼 Send products one by one (image + formatted text)
    for (const p of results) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        mediaUrl: [p.image], // MUST be Cloudinary HTTPS URL
        body: formatProductMessage(p)
      });
    }

    // ✅ Required Twilio response
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
