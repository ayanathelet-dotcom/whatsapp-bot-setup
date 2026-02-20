// Load .env locally only
if (process.env.NODE_ENV !== "production") {
  await import("dotenv/config");
}

import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import path from "path";
import { fileURLToPath } from "url";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// serve checkout page
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

/* ------------------ HEALTH CHECK ------------------ */

app.get("/", (req, res) => {
  res.send("🚀 Perfume WhatsApp Bot Running");
});

/* ------------------ WHATSAPP BOT ------------------ */

app.post("/whatsapp", async (req, res) => {
  try {
    const incomingMsg = req.body.Body || "";
    const from = req.body.From;

    console.log("USER:", incomingMsg);

    const brain = await analyzeUserMessage(incomingMsg);
    const keywords = brain.keywords || [];

    const results = keywordSearch(keywords, products).slice(0, 3);

    if (results.length === 0) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: from,
        body:
          brain.language === "hindi"
            ? "Mujhe perfect match nahi mila 🤔 Thoda aur batayein."
            : "I couldn't find the perfect match 🤔 Tell me more."
      });
      return res.send("<Response></Response>");
    }

    /* OPENING */
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: from,
      body: brain.opening
    });

    /* PRODUCTS */
    for (const p of results) {
      const checkoutLink =
        `${process.env.BASE_URL}/checkout.html?user=${encodeURIComponent(from)}&product=${encodeURIComponent(p.name)}&price=${p.price}&image=${encodeURIComponent(p.image)}`;

      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: from,
        mediaUrl: [p.image],
        body: formatProductMessage(p) + `\n\n🛒 Buy Now:\n${checkoutLink}`
      });
    }

    /* CLOSING */
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: from,
      body: brain.closing
    });

    res.send("<Response></Response>");

  } catch (err) {
    console.error("BOT ERROR:", err);
    res.send("<Response></Response>");
  }
});

/* ------------------ PAYMENT CONFIRM ------------------ */

app.get("/confirm-order", async (req, res) => {
  const user = req.query.user;
  const product = req.query.product || "your perfume";

  const orderId = "ORD" + Math.floor(100000 + Math.random() * 900000);

  if (user) {
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: user,
      body:
        `🎉 Congratulations!\n\n` +
        `Your order for *${product}* is placed successfully.\n` +
        `Order ID: ${orderId}\n\n` +
        `Your order will be shipped in 3–4 days 🚚\n` +
        `Thank you for shopping with us ✨`
    });
  }

  res.send(`
    <h2>✅ Payment Successful</h2>
    <p>Your order is confirmed.</p>
    <p>You can close this page.</p>
  `);
});

/* ------------------ START SERVER ------------------ */

app.listen(PORT, "0.0.0.0", () => {
  console.log("🤖 Bot running on port", PORT);
});