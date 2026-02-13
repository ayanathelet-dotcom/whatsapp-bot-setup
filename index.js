import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import redis from "./redis.js";
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

/* ------------------ REDIS SESSION HELPERS ------------------ */

async function getSession(userNumber) {
  const data = await redis.get(userNumber);
  return data
    ? JSON.parse(data)
    : {
        profile: {
          gender: null,
          budget: null,
          vibe: null,
          occasion: null
        },
        history: [],
        recommendedOnce: false
      };
}

async function saveSession(userNumber, session) {
  await redis.set(userNumber, JSON.stringify(session), "EX", 60 * 60 * 24);
}

/* ------------------ HEALTH CHECK ------------------ */

app.get("/", (req, res) => {
  res.send("WhatsApp AI Bot is running 🚀");
});

/* ------------------ WHATSAPP WEBHOOK ------------------ */

app.post("/whatsapp", async (req, res) => {
  try {
    const incomingMsg = req.body.Body || "";
    const userNumber = req.body.From;

    console.log("USER:", incomingMsg);

    // Load session
    const session = await getSession(userNumber);

    // Store history
    session.history.push(incomingMsg);
    session.history = session.history.slice(-10);

    // Analyze message with AI
    const brain = await analyzeUserMessage(incomingMsg);
    console.log("BRAIN:", brain);

    /* ------------------ UPDATE PROFILE FROM AI ------------------ */

    if (brain.gender) session.profile.gender = brain.gender;
    if (brain.budget) session.profile.budget = brain.budget;
    if (brain.vibe) session.profile.vibe = brain.vibe;
    if (brain.occasion) session.profile.occasion = brain.occasion;

    /* ------------------ GREETING HANDLING ------------------ */

    if (brain.intent === "greeting") {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        body: "Hey 😊 I’d love to help you pick the perfect perfume. Are you looking for something for yourself or as a gift?"
      });

      await saveSession(userNumber, session);
      return res.send("<Response></Response>");
    }

    /* ------------------ SMART FOLLOW-UP QUESTIONS ------------------ */

    if (!session.profile.gender) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        body: "Got it 👍 Is this perfume for a *man* or a *woman*?"
      });

      await saveSession(userNumber, session);
      return res.send("<Response></Response>");
    }

    if (!session.profile.budget) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        body: "Nice 🙂 What budget range are you thinking? (Example: 1500, 2500, 4000)"
      });

      await saveSession(userNumber, session);
      return res.send("<Response></Response>");
    }

    /* ------------------ RECOMMENDATION TRIGGER ------------------ */

    const enhancedKeywords = [
      ...(brain.keywords || []),
      session.profile.gender,
      session.profile.vibe,
      session.profile.occasion
    ].filter(Boolean);

    const results = keywordSearch(enhancedKeywords, products)
      .filter(p => p.price <= session.profile.budget)
      .slice(0, 3);

    /* ------------------ NO RESULTS ------------------ */

    if (results.length === 0) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        body: formatNoResultsReply()
      });

      await saveSession(userNumber, session);
      return res.send("<Response></Response>");
    }

    /* ------------------ SEND RECOMMENDATIONS ------------------ */

    for (const p of results) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: userNumber,
        mediaUrl: [p.image],
        body: formatProductMessage(p)
      });
    }

    session.recommendedOnce = true;

    await saveSession(userNumber, session);

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
