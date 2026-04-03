/** Lightweight category guess when Regex layer has no explicit category. */
export function inferCategoryFromText(
  merchant: string | null,
  body: string,
): string {
  const text = `${merchant ?? ""} ${body}`.toLowerCase();

  const rules: [RegExp, string][] = [
    [/swiggy|zomato|uber\s*eats|food|restaurant|domino|mcdonald|starbucks/i, "Food"],
    [/uber(?!\s*eats)|ola|metro|fuel|petrol|diesel|irctc|rapido/i, "Transport"],
    [/electric|water bill|bses|tata power|utility|broadband|airtel|jio|recharge/i, "Utilities"],
    [/amazon|flipkart|nykaa|shopping|myntra/i, "Shopping"],
    [/movie|bookmyshow|netflix|hotstar|spotify|entertainment/i, "Entertainment"],
    [/hospital|pharmacy|apollo|medical|health/i, "Health"],
    [/atm|cash\s*withdraw|nfs@/i, "Cash"],
    [/upi|imps|neft|rtgs|transfer to/i, "Transfers"],
  ];

  for (const [re, label] of rules) {
    if (re.test(text)) {
      return label;
    }
  }

  return "Uncategorized";
}
