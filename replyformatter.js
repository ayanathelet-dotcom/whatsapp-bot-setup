export function formatNoResultsReply() {
  return (
    "😔 Sorry, I couldn't find a matching perfume.\n" +
    "Try words like *fresh*, *woody*, *romantic*, or *luxury*."
  );
}

export function formatProductMessage(p) {
  let message = `🌟 *${p.name}*\n`;

  if (p.description) {
    message += `${p.description}\n\n`;
  }

  if (p.bestSeller) {
    message += "🔥 *Best Seller*\n";
  }

  if (p.buyersThisMonth) {
    message += `👥 ${p.buyersThisMonth}+ bought this month\n`;
  }

  if (p.price) {
    message += `💰 Price: ₹${p.price}\n`;
  }

  /* ✅ ADD CHECKOUT LINK HERE */
  const checkoutUrl =
    `${process.env.BASE_URL}/checkout.html?name=${encodeURIComponent(p.name)}&price=${p.price}&image=${encodeURIComponent(p.image)}`;

  message += `🛒 Buy now: ${checkoutUrl}\n`;

  return message.trim();
}