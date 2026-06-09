import "dotenv/config";

import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import path from "path";
import { fileURLToPath } from "url";

import { products } from "./products.js";
import { analyzeUserMessage } from "./manage.js";
import { keywordSearch } from "./keywordSearch.js";
import { formatProductMessage } from "./replyformatter.js";

/* ------------------ ENV CHECK ------------------ */

console.log("🔑 BASE_URL:", process.env.BASE_URL);

/* ------------------ TWILIO CLIENT ------------------ */

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/* ------------------ EXPRESS APP ------------------ */

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

/* ------------------ TEMP ORDER STORAGE ------------------ */

const pendingOrders = {};

/* ------------------ HEALTH CHECK ------------------ */

app.get("/", (req, res) => {
  res.send("🚀 Perfume WhatsApp Bot Running");
});

/* ------------------ BUY ROUTE (FIXED) ------------------ */

app.get("/buy/:id", (req, res) => {
  const order = pendingOrders[req.params.id];

  if (!order) {
    return res.send("<h2>❌ Invalid or expired link</h2>");
  }

  // ✅ Direct checkout page (NO redirect confusion)
  res.send(`
    <html>
      <head>
        <title>Checkout</title>
      </head>
      <body style="font-family: Arial; text-align:center; padding:40px;">

        <h2>🛍️ Checkout</h2>

        <img src="${order.image}" width="200"/>

        <h3>${order.product}</h3>
        <p>Price: ₹${order.price}</p>

        <br>

        <input placeholder="Your Name" /><br><br>
        <input placeholder="Phone Number" /><br><br>

        <button onclick="alert('✅ Order placed (Demo)')">
          BUY NOW
        </button>

      </body>
    </html>
  `);
});

/* ------------------ WHATSAPP BOT ------------------ */

app.post("/whatsapp", async (req, res) => {
  try {
    const incomingMsg = req.body.Body || "";
    const from = req.body.From;

    const brain = await analyzeUserMessage(incomingMsg);
    const keywords = brain.keywords || [];

    const searchedProducts = keywordSearch(keywords, products);

    const results = searchedProducts.slice(0, 3);

    if (results.length === 0) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: from,
        body: "❌ No perfumes found."
      });
      return res.send("<Response></Response>");
    }

    // Opening message
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: from,
      body: brain.opening
    });

    for (const p of results) {

      const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();

      pendingOrders[shortId] = {
        user: from,
        product: p.name,
        price: p.price,
        image: p.image
      };

      const baseUrl = process.env.BASE_URL;

      if (!baseUrl) {
        throw new Error("❌ BASE_URL missing");
      }

      const shortLink = `${baseUrl.replace(/\/$/, "")}/buy/${shortId}`.trim();

      console.log("FINAL LINK:", shortLink);

      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: from,
        mediaUrl: [p.image],
        body: `${formatProductMessage(p)}

🛒 Buy Now:
${shortLink}`
      });
    }

    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: from,
      body: brain.closing
    });

    res.send("<Response></Response>");

  } catch (err) {
    console.error(err);
    res.send("<Response></Response>");
  }
});

/* ------------------ START SERVER ------------------ */

app.listen(PORT, "0.0.0.0", () => {
  console.log("🤖 Running on port", PORT);
});