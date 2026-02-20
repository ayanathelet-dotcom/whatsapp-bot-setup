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

  return message.trim();
}