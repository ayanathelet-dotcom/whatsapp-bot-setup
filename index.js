require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const PORT = process.env.PORT || 3000;

console.log("ENV PORT:", PORT);

/* -------------------------------
   FAKE DATABASE (PRODUCT MEMORY)
--------------------------------*/
let lastUserProduct = {}; 
// stores last product each user selected
// format: { "whatsapp:+91xxxx": "Citrus Rush" }


/* -------------------------------
   GENERATE FAKE ORDER ID
--------------------------------*/
function generateOrderId() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = Math.floor(100000 + Math.random() * 900000);
  const randomLetter = letters[Math.floor(Math.random() * letters.length)];
  return `ORD-${randomLetter}${nums}`;
}


/* -------------------------------
   WHATSAPP BOT WEBHOOK
--------------------------------*/
app.post("/whatsapp", async (req, res) => {
  const incomingMsg = req.body.Body?.toLowerCase() || "";
  const from = req.body.From;

  let reply = "";

  // ---- Simple product detection (edit if needed)
  if (incomingMsg.toLowerCase().includes("citrus")) {

  lastUserProduct[from] = "Citrus Rush";

  reply =
    "Great choice! Citrus Rush is fresh and energetic 🍊\n\n" +
    "To order, click checkout:\n" +
    process.env.BASE_URL +
    "/demo-payment-success?user=" +
    encodeURIComponent(from) +
    "&product=" +
    encodeURIComponent("Citrus Rush");

} 
else if (incomingMsg.toLowerCase().includes("amber")) {

  lastUserProduct[from] = "Amber Sky";

  reply =
    "Amber Sky is warm and luxurious ✨\n\n" +
    "To order, click checkout:\n" +
    process.env.BASE_URL +
    "/demo-payment-success?user=" +
    encodeURIComponent(from) +
    "&product=" +
    encodeURIComponent("Amber Sky");
  } else {
    reply =
      "Hi! Ask me about perfumes like Citrus Rush or Amber Sky, and I’ll help you choose 🌸";
  }

  res.set("Content-Type", "text/xml");
  res.send(`
    <Response>
      <Message>${reply}</Message>
    </Response>
  `);
});


/* -------------------------------
   DEMO CHECKOUT SUCCESS ENDPOINT
   (CALL THIS AFTER PAY BUTTON)
--------------------------------*/
app.get("/demo-payment-success", async (req, res) => {
  const user = req.query.user;

  if (!user) {
    return res.send("User missing");
  }

  const product = lastUserProduct[user] || "your perfume";
  const orderId = generateOrderId();

  const message = `🎉 Congratulations!

Your order for *${product}* is placed successfully.

🧾 Order ID: ${orderId}

🚚 Your order will be shipped in 3–4 days.

Thank you for shopping with us!`;

  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: user,
    });

    res.send("Payment success message sent on WhatsApp ✅");
  } catch (err) {
    console.error(err);
    res.send("Error sending WhatsApp message");
  }
});


/* -------------------------------
   HEALTH ROUTE
--------------------------------*/
app.get("/", (req, res) => {
  res.send("🤖 WhatsApp Perfume Bot Running");
});


/* -------------------------------
   START SERVER
--------------------------------*/
app.listen(PORT, () => {
  console.log("🤖 WhatsApp bot running on port", PORT);
});