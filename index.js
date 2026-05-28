import "dotenv/config";

import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import path from "path";
import { fileURLToPath } from "url";

import { products } from "./products.js";
import { analyzeUserMessage } from "./manage.js";
import { keywordSearch } from "./keywordSearch.js";
import { formatProductMessage, formatPriceInsight } from "./replyformatter.js";

/* ------------------ ENV CHECK ------------------ */

console.log("🔑 GROQ LOADED:", !!process.env.GROQ_API_KEY);
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

/* ------------------ SMART PRICE ENGINE ------------------ */

function filterByBudget(products, budget) {
  const underBudget = products.filter(p => p.price <= budget);

  // ✅ CASE 1: Perfect match
  if (underBudget.length > 0) {
    return {
      type: "exact",
      data: underBudget.sort((a, b) => b.price - a.price)
    };
  }

  // ❌ CASE 2: No match → nearest cheaper OR slightly higher
  let nearest = products.reduce((prev, curr) => {
    return Math.abs(curr.price - budget) < Math.abs(prev.price - budget)
      ? curr
      : prev;
  });

  return {
    type: "nearest",
    data: [nearest]
  };
}

/* ------------------ COMPANY PRICE GUIDE ------------------ */

function getBrandPricingInfo(products, budget) {
  const brands = {};

  products.forEach(p => {
    if (!brands[p.brand]) brands[p.brand] = [];
    brands[p.brand].push(p.price);
  });

  let message = "ℹ️ *Brand Pricing Guide:*\n\n";

  Object.keys(brands).forEach(brand => {
    const min = Math.min(...brands[brand]);
    const max = Math.max(...brands[brand]);

    if (budget < min) {
      message += `• ${brand} starts from ₹${min}\n`;
    }
  });

  return message;
}

/* ------------------ HEALTH CHECK ------------------ */

app.get("/", (req, res) => {
  res.send("🚀 Perfume WhatsApp Bot Running");
});

/* ------------------ SHORT LINK ROUTE ------------------ */

app.get("/buy/:id", (req, res) => {
  const order = pendingOrders[req.params.id];

  if (!order) {
    return res.send("<h2>Invalid or expired link</h2>");
  }

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

    /* 🧠 AI */
    const brain = await analyzeUserMessage(incomingMsg);
    const keywords = brain.keywords || [];

    /* 🔍 SEARCH */
    const searchedProducts = keywordSearch(keywords, products);

    /* 💰 EXTRACT BUDGET */
    const budgetMatch = incomingMsg.match(/\d+/);
    const budget = budgetMatch ? parseInt(budgetMatch[0]) : null;

    let results = [];
    let pricingNote = "";

    /* 🎯 PRICE LOGIC */
    if (budget) {
      const filtered = filterByBudget(searchedProducts, budget);

      if (filtered.type === "exact") {
        results = filtered.data.slice(0, 3);
        pricingNote = `✅ Showing perfumes under ₹${budget}`;
      } else {
        results = filtered.data;

        pricingNote =
          `⚠️ No perfumes under ₹${budget}.\n` +
          `Showing closest option instead.\n\n` +
          getBrandPricingInfo(products, budget);
      }
    } else {
      results = searchedProducts.slice(0, 3);
    }

    /* ❌ NO RESULT */
    if (results.length === 0) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: from,
        body: "❌ No matching perfumes found. Try something else."
      });
      return res.send("<Response></Response>");
    }

    /* 🧠 OPENING */
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: from,
      body: brain.opening
    });

    /* 💰 PRICE MESSAGE */
    if (pricingNote) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: from,
        body: pricingNote
      });
    }

    /* 🧴 PRODUCTS */
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
        throw new Error("❌ BASE_URL not set in .env");
      }

      const shortLink = `${baseUrl.replace(/\/$/, "")}/buy/${shortId}`;

      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: from,
        mediaUrl: [p.image],
        body:
          formatProductMessage(p) +
          `\n\n🛒 *Buy Now:* ${shortLink}`
      });
    }

    /* 🧠 CLOSING */
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: from,
      body: brain.closing
    });

    res.send("<Response></Response>");

  } catch (err) {
    console.error("❌ BOT ERROR:", err);
    res.send("<Response></Response>");
  }
});

/* ------------------ PAYMENT CONFIRM ------------------ */

app.get("/confirm-order", async (req, res) => {
  try {
    const user = req.query.user;
    const product = req.query.product || "your perfume";

    const orderId = "ORD" + Math.floor(100000 + Math.random() * 900000);

    if (user) {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: user,
        body:
          `🎉 Order Confirmed!\n\n` +
          `Product: *${product}*\n` +
          `Order ID: ${orderId}\n\n` +
          `Delivery in 3–4 days 🚚`
      });
    }

    res.send("<h2>✅ Payment Successful</h2>");

  } catch (err) {
    console.error(err);
    res.send("Error");
  }
});

/* ------------------ START SERVER ------------------ */

app.listen(PORT, "0.0.0.0", () => {
  console.log("🤖 Bot running on port", PORT);
});