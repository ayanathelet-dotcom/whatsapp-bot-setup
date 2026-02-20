// Load .env locally only
if (process.env.NODE_ENV !== "production") {
  await import("dotenv/config");
}

import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import path from "path";
import { fileURLToPath } from "url";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// serve static checkout files
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

/* ------------------ HEALTH CHECK ------------------ */

app.get("/", (req, res) => {
  res.send("🚀 Perfume Bot Running");
});

/* ------------------ WHATSAPP WEBHOOK ------------------ */

app.post("/whatsapp", async (req, res) => {
  const incomingMsg = (req.body.Body || "").toLowerCase();
  const from = req.body.From;

  let reply =
    "Tell me what type of perfume you want — citrus, amber, sweet, fresh etc.";

  if (incomingMsg.includes("citrus")) {
    reply =
      "Great choice! Citrus Rush is fresh 🍊\n\n" +
      "Checkout here:\n" +
      process.env.BASE_URL +
      "/checkout.html?user=" +
      encodeURIComponent(from) +
      "&product=" +
      encodeURIComponent("Citrus Rush") +
      "&price=1499" +
      "&image=https://images.unsplash.com/photo-1582211594533-268f4f1edcb9?q=80&w=600";
  }

  if (incomingMsg.includes("amber")) {
    reply =
      "Amber Sky is warm and luxurious ✨\n\n" +
      "Checkout here:\n" +
      process.env.BASE_URL +
      "/checkout.html?user=" +
      encodeURIComponent(from) +
      "&product=" +
      encodeURIComponent("Amber Sky") +
      "&price=1799" +
      "&image=https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=600";
  }

  await client.messages.create({
    from: "whatsapp:+14155238886",
    to: from,
    body: reply
  });

  res.send("<Response></Response>");
});

/* ------------------ PAYMENT CONFIRM ROUTE ------------------ */

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
        `It will be shipped in 3–4 days 🚚`
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