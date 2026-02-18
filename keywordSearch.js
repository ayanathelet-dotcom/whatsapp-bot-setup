export function keywordSearch(keywords, products) {

/* ---------- NORMALIZE INPUT ---------- */

const cleaned = keywords.map(w => w.toLowerCase());

/* ---------- MAPS ---------- */

const relationshipMap = {
  boyfriend: "boyfriend",
  husband: "husband",
  father: "father",
  dad: "father",
  brother: "brother",
  uncle: "uncle",

  girlfriend: "girlfriend",
  wife: "wife",
  mother: "mother",
  mom: "mother",
  sister: "sister",
  aunt: "aunt",

  couple: "couple",
  couples: "couple"
};

const relationshipGenderMap = {
  boyfriend: "men",
  husband: "men",
  father: "men",
  brother: "men",
  uncle: "men",

  girlfriend: "women",
  wife: "women",
  mother: "women",
  sister: "women",
  aunt: "women"
};

const occasionMap = {
  party: "party",
  club: "club",
  office: "office",
  wedding: "wedding",
  anniversary: "anniversary",
  travel: "travel",
  date: "date",
  daily: "daily",
  evening: "evening",
  function: "function"
};

const intensityMap = {
  light: "light",
  heavy: "heavy",
  medium: "medium"
};

const sweetnessMap = {
  sweet: "sweet",
  mild: "mild",
  no: "no"
};

const ageKeywords = ["young","middle","old"];

/* ---------- EXTRACT USER SIGNALS ---------- */

const genderKeyword = cleaned.find(w => ["men","women","unisex"].includes(w));
const relationshipKeyword = cleaned.find(w => relationshipMap[w]);
const occasionKeyword = cleaned.find(w => occasionMap[w]);
const intensityKeyword = cleaned.find(w => intensityMap[w]);
const sweetnessKeyword = cleaned.find(w => sweetnessMap[w]);
const ageKeyword = cleaned.find(w => ageKeywords.includes(w));

const inferredGender =
  relationshipKeyword && relationshipGenderMap[relationshipKeyword]
    ? relationshipGenderMap[relationshipKeyword]
    : null;

const giftIntent =
  cleaned.includes("gift") ||
  cleaned.includes("present") ||
  cleaned.includes("birthday");

/* ---------- SCORING ---------- */

let scored = products.map(product => {

  let score = 0;

/* --- HARD ATTRIBUTE MATCHING --- */

  if (relationshipKeyword &&
      product.relationship?.includes(relationshipMap[relationshipKeyword]))
    score += 3;

  if (ageKeyword && product.ageGroup?.includes(ageKeyword))
    score += 2;

  if (occasionKeyword &&
      product.occasion?.includes(occasionMap[occasionKeyword]))
    score += 2.5;

  if (intensityKeyword &&
      product.intensity === intensityMap[intensityKeyword])
    score += 1.5;

  if (sweetnessKeyword &&
      product.sweetness === sweetnessMap[sweetnessKeyword])
    score += 1.5;

/* --- TEXT MATCHING --- */

  cleaned.forEach(word => {
    if (product.name.toLowerCase().includes(word)) score += 1.2;
    if (product.notes.some(n => n.includes(word))) score += 2;
  });

/* --- GIFT BOOST --- */

  if (giftIntent && product.relationship?.length)
    score += 1.5;

/* --- POPULARITY (SOFT WEIGHT) --- */

  score += (product.buyersThisMonth || 0) / 2000;

/* --- BESTSELLER BONUS (CONTROLLED) --- */

  if (product.bestSeller) score += 1;

/* --- DIVERSITY RANDOMNESS (ANTI-REPETITION) --- */

  score += Math.random() * 0.6;

  return { ...product, score };

});

/* ---------- HARD GENDER FILTER (CRITICAL) ---------- */

if (genderKeyword) {
  scored = scored.filter(p => p.gender === genderKeyword);
}
else if (inferredGender) {
  scored = scored.filter(p => p.gender === inferredGender);
}

/* ---------- FINAL RANKING ---------- */

return scored
  .filter(p => p.score > 1)
  .sort((a,b) => b.score - a.score)
  .slice(0,3);
}
