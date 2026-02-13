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

// ------------------ SESSION MEMORY ------------------

const userSessions = {};


/* ------------------ HEALTH CHECK ------------------ */

app.get("/", (req, res) => {
  res.send("WhatsApp AI Bot is running 🚀");
});

/* ------------------ WHATSAPP WEBHOOK ------------------ */

app.post("/whatsapp", async (req, res) => {
  try {
    const incomingMsg = req.body.Body || "";
    const userNumber = req.body.From;
    const message = incomingMsg.toLowerCase();

    console.log("USER:", incomingMsg);

    // ------------------ SESSION INIT ------------------

    if (!userSessions[userNumber]) {
      userSessions[userNumber] = {
        stage: "start",
        data: {}
      };
    }

    const session = userSessions[userNumber];

    // ------------------ STAGE: START ------------------

    if (session.stage === "start") {
      session.stage = "ask_gender";

      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        body: "Is this perfume for a *man* or a *woman*?"
      });

      return res.send("<Response></Response>");
    }

    // ------------------ STAGE: ASK GENDER ------------------

    if (session.stage === "ask_gender") {

      if (message.includes("man") || message.includes("male") || message.includes("husband")) {
        session.data.gender = "men";
      } 
      else if (message.includes("woman") || message.includes("female") || message.includes("wife")) {
        session.data.gender = "women";
      } 
      else {
        await client.messages.create({
          from: "whatsapp:+14155238886",
          to: userNumber,
          body: "Please reply with *man* or *woman* 😊"
        });

        return res.send("<Response></Response>");
      }

      session.stage = "ask_budget";

      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        body: "What’s your budget range? (Example: 1500, 2000, 3000)"
      });

      return res.send("<Response></Response>");
    }

    // ------------------ STAGE: ASK BUDGET ------------------

    if (session.stage === "ask_budget") {

      const budgetMatch = message.match(/\d+/);

      if (!budgetMatch) {
        await client.messages.create({
          from: "whatsapp:+14155238886",
          to: userNumber,
          body: "Please enter a valid budget like *2000* 😊"
        });

        return res.send("<Response></Response>");
      }

      session.data.budget = parseInt(budgetMatch[0]);
      session.stage = "recommend";
    }

    // ------------------ RECOMMENDATION STAGE ------------------

    // 🧠 Analyze user intent (AI only used here)
    const brain = await analyzeUserMessage(incomingMsg);
    console.log("BRAIN:", brain);

    // Add collected gender to keywords
    let enhancedKeywords = [...brain.keywords];

    if (session.data.gender) {
      enhancedKeywords.push(session.data.gender);
    }

    // 🔍 Search products
    const results = keywordSearch(enhancedKeywords, products)
      .filter(p => p.price <= session.data.budget)
      .slice(0, 3);

    // ❌ No results
    if (results.length === 0) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        body: formatNoResultsReply()
      });

      session.stage = "start";
      session.data = {};

      return res.send("<Response></Response>");
    }

    // 🖼 Send products
    for (const p of results) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        mediaUrl: [p.image],
        body: formatProductMessage(p)
      });
    }

    // 🧠 Reset session after recommendation
    session.stage = "start";
    session.data = {};

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
