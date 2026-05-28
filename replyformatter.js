/* ------------------ NO RESULT MESSAGE ------------------ */

export function formatNoResultsReply(brain) {
  return (
    (brain?.language === "hindi"
      ? "😔 Mujhe perfect perfume nahi mila.\n"
      : "😔 I couldn't find a perfect perfume match.\n") +
    "👉 Try keywords like *fresh*, *woody*, *romantic*, *luxury*\n" +
    "💡 Or tell me your *budget* (example: under 1000)"
  );
}

/* ------------------ PRODUCT MESSAGE ------------------ */

export function formatProductMessage(p) {
  let message = `🌟 *${p.name}*\n`;

  /* 🧾 Description */
  if (p.description) {
    message += `${p.description}\n\n`;
  }

  /* 🔥 Bestseller Highlight */
  if (p.bestSeller) {
    message += "🔥 *Best Seller*\n";
  }

  /* 👥 Social Proof */
  if (p.buyersThisMonth) {
    message += `👥 ${p.buyersThisMonth}+ people bought this month\n`;
  }

  /* 💰 PRICE (VERY IMPORTANT PART) */
  if (p.price) {
    message += `💰 *Price: ₹${p.price}*\n`;
  }

  /* 🧠 TRUST BUILDER */
  message += "\n✔️ Fast Delivery Available";

  return message.trim();
}

/* ------------------ PRICE EDUCATION MESSAGE ------------------ */

export function formatPriceInsight(budget, type) {
  if (type === "exact") {
    return `✅ Showing perfumes strictly under ₹${budget}`;
  }

  return (
    `⚠️ No perfumes available under ₹${budget}.\n` +
    `👉 Showing closest available option.\n\n` +
    `💡 Tip: Premium perfumes usually start from ₹1200+`
  );
}