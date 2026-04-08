/** Expanded category inference — covers more Indian merchants and keywords. */
export function inferCategoryFromText(
  merchant: string | null,
  body: string,
): string {
  const text = `${merchant ?? ""} ${body}`.toLowerCase();

  const rules: [RegExp, string][] = [
    // Food & Dining
    [/swiggy|zomato|uber\s*eats|domino|pizza|mcdonald|kfc|burger|starbucks|cafe|restaurant|biryani|dhaba|blinkit|zepto|instamart|dunzo|bigbasket|grofer|dmart|reliance\s*fresh|more\s*supermarket|spencers|food|dining|eat/i, "Food"],
    // Transport
    [/uber(?!\s*eats)|ola\b|rapido|metro|dmrc|bmtc|best\s*bus|irctc|railway|redbus|makemytrip|goibibo|indigo|spicejet|airindia|vistara|fuel|petrol|diesel|hp\s*petrol|bharat\s*petroleum|indian\s*oil|iocl|hpcl|bpcl|fastag|toll/i, "Transport"],
    // Utilities & Bills
    [/electric|electricity|water\s*bill|bses|tata\s*power|adani\s*electric|msedcl|bescom|tneb|utility|broadband|airtel|jio|vi\b|vodafone|idea|bsnl|recharge|dth|tatasky|dish\s*tv|sun\s*direct|gas\s*bill|piped\s*gas|mahanagar\s*gas|indraprastha\s*gas/i, "Utilities"],
    // Shopping
    [/amazon|flipkart|myntra|nykaa|ajio|meesho|snapdeal|shopsy|tata\s*cliq|reliance\s*digital|croma|vijay\s*sales|shopping|mall|store|mart(?!\s*bus)/i, "Shopping"],
    // Entertainment
    [/netflix|hotstar|disney|prime\s*video|sony\s*liv|zee5|jiocinema|spotify|gaana|wynk|bookmyshow|pvr|inox|movie|cinema|concert|event|gaming|steam/i, "Entertainment"],
    // Health & Medical
    [/hospital|clinic|pharmacy|apollo|medplus|netmeds|1mg|practo|doctor|medical|health|diagnostic|lab\s*test|pathology|dental|optician|chemist/i, "Health"],
    // Education
    [/school|college|university|tuition|coaching|byju|unacademy|vedantu|coursera|udemy|exam\s*fee|admission|library/i, "Education"],
    // Cash Withdrawal
    [/atm|cash\s*withdraw|nfs@|cash\s*at/i, "Cash"],
    // Transfers (last — broad match)
    [/upi|imps|neft|rtgs|transfer\s*to|sent\s*to|paid\s*to/i, "Transfers"],
  ];

  for (const [re, label] of rules) {
    if (re.test(text)) {
      return label;
    }
  }

  return "Other";
}
