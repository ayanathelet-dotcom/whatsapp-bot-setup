export function keywordSearch(keywords, products) {



/* -------------------- NORMALIZATION MAPS -------------------- */

const synonymMap = {
  husband: "men",
  wife: "women",
  man: "men",
  woman: "women",
  male: "men",
  female: "women",
  girl: "young",
  boy: "young",
  masculine: "men",
  feminine: "women",
  woody: "wood",
  smoky: "smoke"
};

const relationshipMap = {
  boyfriend: "boyfriend",
  husband: "husband",
  girlfriend: "girlfriend",
  wife: "wife",
  mom: "mother",
  mummy: "mother",
  mother: "mother",
  dad: "father",
  daddy: "father",
  father: "father",
  brother: "brother",
  sister: "sister",
  uncle: "uncle",
  aunt: "aunt",
  aunty: "aunt",
  couples: "couple"
};

const ageKeywords = ["young", "middle", "old"];

const intensityMap = {
  "light-fragrance": "light",
  light: "light",
  heavy: "heavy",
  "heavy-fragrance": "heavy"
};

const sweetnessMap = {
  sweet: "sweet",
  "sweet-fragrance": "sweet"
};

const occasionMap = {
  wedding: "wedding",
  anniversary: "anniversary",
  party: "party",
  club: "party",
  travelling: "travel",
  travel: "travel",
  office: "office",
  function: "function",
  event: "event",
  date: "date"
};

const stopWords = ["perfume", "fragrance", "scent", "for", "a", "the"];

/* -------------------- MAIN FUNCTION -------------------- */



  /* ---------- CLEAN ---------- */

  const cleaned = keywords
    .map(w => synonymMap[w.toLowerCase()] || w.toLowerCase())
    .filter(w => !stopWords.includes(w));

  console.log("CLEANED KEYWORDS:", cleaned);

  /* ---------- EXTRACT ---------- */

  const genderKeyword = cleaned.find(w => w === "men" || w === "women");
  const relationshipKeyword = cleaned.find(w => relationshipMap[w]);
  const ageKeyword = cleaned.find(w => ageKeywords.includes(w));
  const intensityKeyword = cleaned.find(w => intensityMap[w]);
  const sweetnessKeyword = cleaned.find(w => sweetnessMap[w]);
  const occasionKeyword = cleaned.find(w => occasionMap[w]);

  /* ---------- INFER GENDER ---------- */

  let inferredGender = null;

  if (relationshipKeyword) {
    const maleRelations = ["boyfriend", "husband", "father", "dad", "brother", "uncle"];
    const femaleRelations = ["girlfriend", "wife", "mother", "mom", "sister", "aunt"];

    if (maleRelations.includes(relationshipKeyword)) inferredGender = "men";
    if (femaleRelations.includes(relationshipKeyword)) inferredGender = "women";
  }

  /* ---------- SCORING ---------- */

  let scored = products.map(product => {
    let score = 0;
    const productGender = product.gender?.toLowerCase();

    // Relationship
    if (
      relationshipKeyword &&
      product.relationship?.includes(
        relationshipMap[relationshipKeyword]
      )
    ) score += 2.5;

    // Age
    if (ageKeyword && product.ageGroup?.includes(ageKeyword)) score += 2;

    // Occasion
    if (
      occasionKeyword &&
      product.occasion?.includes(
        occasionMap[occasionKeyword]
      )
    ) score += 2;

    // Intensity
    if (
      intensityKeyword &&
      product.intensity === intensityMap[intensityKeyword]
    ) score += 1.5;

    // Sweetness
    if (
      sweetnessKeyword &&
      product.sweetness === sweetnessMap[sweetnessKeyword]
    ) score += 1.5;

    // Text match
    cleaned.forEach(word => {
      if (product.name.toLowerCase().includes(word)) score += 1;
      if (product.notes.some(n => n.includes(word))) score += 2;
    });

    // Popularity
    if (product.buyersThisMonth) score += product.buyersThisMonth / 1000;

    // Bestseller
    if (product.bestSeller) score += 2;

    return {
      ...product,
      gender: productGender,
      score
    };
  });

  /* ---------- HARD GENDER FILTER ---------- */

  if (genderKeyword) {
    scored = scored.filter(p => p.gender === genderKeyword);
  } 
  else if (inferredGender) {
    scored = scored.filter(p => p.gender === inferredGender);
  }

  console.log("AFTER GENDER FILTER:", scored.map(p => p.gender));

  /* ---------- FINAL ---------- */

  return scored
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
      .slice(0, 5);
}
