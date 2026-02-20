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

// serve static files (checkout page)
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

/* ------------------ TEMP ORDER STORAGE (FOR SHORT LINKS) ------------------ */

const pendingOrders = {}; // demo in-memory store

/* ------------------ HEALTH CHECK ------------------ */

app.get("/", (req, res) => {
  res.send("🚀 Perfume WhatsApp Bot Running");
});

/* ------------------ SHORT BUY LINK ROUTE ------------------ */

app.get("/buy/:id", (req, res) => {
  const order = pendingOrders[req.params.id];

  if (!order) {
    return res.send("Invalid or expired order link.");
  }

  // redirect to checkout page with real params
  res.redirect(
    `/checkout.html?user=${encodeURIComponent(order.user)}&product=${encodeURIComponent(order.product)}&price=${order.price}&image=${encodeURIComponent(order.image)}`
  );
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

    /* ❌ NO RESULT */
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

    /* 🧠 OPENING MESSAGE */
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: from,
      body: brain.opening
    });

    /* 🧴 PRODUCTS WITH SHORT BUY LINKS */
    for (const p of results) {

      // generate short ID
      const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();

      // store order temporarily
      pendingOrders[shortId] = {
        user: from,
        product: p.name,
        price: p.price,
        image: p.image
      };

      const shortLink = `${process.env.BASE_URL}/buy/${shortId}`;

      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: from,
        mediaUrl: [p.image],
        body:
          formatProductMessage(p) +
          `\n\n🛒 *Buy Now:* ${shortLink}`
      });
    }

    /* 🧠 CLOSING MESSAGE */
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

/* ------------------ PAYMENT CONFIRMATION ------------------ */

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