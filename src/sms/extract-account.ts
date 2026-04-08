/**
 * Maps SMS sender IDs (alphanumeric) to human-readable bank/account names.
 * Indian banks use 6-char sender IDs like HDFCBK, SBIINB, ICICIB, etc.
 */
const SENDER_MAP: [RegExp, string][] = [
  [/HDFC/i, "HDFC Bank"],
  [/SBIINB|SBICRD|SBIUPI|SBI/i, "SBI"],
  [/ICICI/i, "ICICI Bank"],
  [/AXISBK|AXISBN|AXIS/i, "Axis Bank"],
  [/KOTAKB|KOTAK/i, "Kotak Bank"],
  [/PNBSMS|PNBINB|PNB/i, "PNB"],
  [/BOIIND|BOINDB|BOI/i, "Bank of India"],
  [/CANBNK|CANARA/i, "Canara Bank"],
  [/UNIONB|UBINDB/i, "Union Bank"],
  [/INDUSB|INDUS/i, "IndusInd Bank"],
  [/YESBNK|YESBK/i, "Yes Bank"],
  [/IDBIBK|IDBI/i, "IDBI Bank"],
  [/FEDERL|FEDBK/i, "Federal Bank"],
  [/RBLBNK|RBL/i, "RBL Bank"],
  [/SCBNK|SCBINB|SCBIND/i, "Standard Chartered"],
  [/CITIBK|CITI/i, "Citibank"],
  [/HSBCIN|HSBC/i, "HSBC"],
  [/PAYTMB|PAYTM/i, "Paytm Bank"],
  [/FREECHARGE|FREECRG/i, "FreeCharge"],
  [/PHONEPE|PHPE/i, "PhonePe"],
  [/GPAY|GOOGLEPAY/i, "Google Pay"],
  [/AMAZONPAY|AMZNPAY/i, "Amazon Pay"],
  [/JIOMNY|JIOMONEY/i, "Jio Money"],
  [/MOBIKWIK|MBKWIK/i, "MobiKwik"],
  [/AIRTEL/i, "Airtel Payments Bank"],
  [/IOBSMS|IOB/i, "Indian Overseas Bank"],
  [/BARODASMS|BARODA|BOB/i, "Bank of Baroda"],
  [/CENTBK|CENTRAL/i, "Central Bank"],
  [/SYNDBK|SYNDICATE/i, "Syndicate Bank"],
  [/ALLBNK|ALLAHABAD/i, "Allahabad Bank"],
];

/**
 * Returns a human-readable account/bank name from an SMS sender address.
 * Falls back to the raw sender ID if no match found.
 */
export function extractAccountFromSender(address: string): string {
  if (!address) return "Unknown";
  const upper = address.trim().toUpperCase();

  for (const [re, name] of SENDER_MAP) {
    if (re.test(upper)) return name;
  }

  // If it looks like a bank sender ID (all caps, 4-8 chars, no spaces), use it as-is
  if (/^[A-Z0-9]{4,8}$/.test(upper)) return upper;

  return "Unknown";
}
