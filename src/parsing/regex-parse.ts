import { inferCategoryFromText } from "@/parsing/category-infer";
import type { ParsedTransaction } from "@/parsing/types";

const RS = "(?:Rs\\.?|INR|₹)";
const AMT = "([\\d,]+(?:\\.\\d{1,2})?)";

/** Pull first calendar date from common Indian SMS formats into YYYY-MM-DD. */
export function extractDateFromSmsBody(
  body: string,
  fallbackMs?: number,
): string {
  const dmY = body.match(
    /\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/,
  );
  if (dmY) {
    const [, d, m, y] = dmY;
    return yPad(Number(d), Number(m), Number(y));
  }

  const dMonY = body.match(
    /\b(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{2,4})\b/i,
  );
  if (dMonY) {
    const day = Number(dMonY[1]);
    const mon = monthAbbrevToNum(dMonY[2]);
    const year = expandTwoDigitYear(Number(dMonY[3]));
    if (mon != null) {
      return `${year}-${pad2(mon)}-${pad2(day)}`;
    }
  }

  if (fallbackMs != null && Number.isFinite(fallbackMs)) {
    const dt = new Date(fallbackMs);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString().slice(0, 10);
    }
  }

  return new Date().toISOString().slice(0, 10);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function expandTwoDigitYear(y: number): number {
  if (y >= 100) {
    return y;
  }
  const pivot = new Date().getFullYear() - 2000;
  return y > pivot + 10 ? 1900 + y : 2000 + y;
}

function monthAbbrevToNum(m: string): number | null {
  const map: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  const key = m.slice(0, 3).toLowerCase();
  return map[key] ?? null;
}

function yPad(day: number, month: number, year: number): string {
  const y = year < 100 ? expandTwoDigitYear(year) : year;
  return `${y}-${pad2(month)}-${pad2(day)}`;
}

function parseAmountToken(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeMerchant(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }
  const t = raw.replace(/\s+/g, " ").trim();
  return t.length > 0 ? t.slice(0, 200) : null;
}

/**
 * Layer 1: fast regex for typical Indian banking / UPI SMS (English, Rs/INR/₹).
 * Returns null when no reliable financial row can be inferred.
 */
export function parseSmsWithRegex(
  body: string,
  smsDateMs?: number,
): ParsedTransaction | null {
  const upper = body.toUpperCase();
  const hasMoneyKeyword =
    /(RS\.?|INR|₹|\bRupees?\b)/i.test(body) ||
    /\bUPI\b/.test(upper) ||
    /\bIMPS\b|\bNEFT\b|\bRTGS\b/.test(upper);

  if (!hasMoneyKeyword) {
    return null;
  }

  let type: "credit" | "debit" | null = null;
  if (
    /\bDEBITED\b|\bDR\.?\b|\bDEBIT\b|debited\s+from\s+a\/?c|\bUPI-?DR\b|sent\s+via\s+UPI|paid\s+to|\bPAID\b|\bSPENT\b|\bPURCHASE\b|\bWITHDRAW(NAL|N)?\b/i.test(
      body,
    )
  ) {
    type = "debit";
  } else if (
    /\bCREDITED\b|\bCR\.?\b|\bCREDIT\b|\bRECEIVED\b|\bDEPOSITED\b|\bUPI-?CR\b/i.test(
      body,
    )
  ) {
    type = "credit";
  }

  if (type == null) {
    return null;
  }

  let amount: number | null = null;

  const amountPatterns: RegExp[] = [
    new RegExp(`${RS}\\s*${AMT}`, "i"),
    new RegExp(`${AMT}\\s*${RS}`, "i"),
    new RegExp(
      `(?:debited|credited|transfer(?:red)?|paid|sent|received|txn(?:act)?)[:\\s]+(?:for\\s+)?(?:Rs\\.?|INR|₹)?\\s*${AMT}`,
      "i",
    ),
    new RegExp(`(?:amount|amt)[:\\s]+(?:Rs\\.?|INR|₹)?\\s*${AMT}`, "i"),
  ];

  for (const re of amountPatterns) {
    const m = body.match(re);
    if (m?.[1]) {
      amount = parseAmountToken(m[1]);
      if (amount != null) {
        break;
      }
    }
  }

  if (amount == null) {
    return null;
  }

  const merchant =
    extractMerchant(body) ?? (/\bUPI\b/i.test(body) ? "UPI" : null);

  const date = extractDateFromSmsBody(body, smsDateMs);
  const category = inferCategoryFromText(merchant, body);

  return {
    amount,
    currency: "INR",
    merchant,
    date,
    category,
    type,
  };
}

function extractMerchant(body: string): string | null {
  const patterns: RegExp[] = [
    /\bto\s+([A-Za-z0-9*&.\-' ]{3,80}?)(?:\s+on\s+\d|\s+Ref|\s+UPI|\s+Avl|\.\s*$)/i,
    /\b(?:at|@)\s+([A-Za-z0-9*&.\-' ]{3,60})/i,
    /merchant[/\s:]+([A-Za-z0-9*&.\-' ]{3,60})/i,
    /Info:?\s*([A-Za-z0-9*&.\-' ]{3,60})/i,
    /UPI\/(?:CR|DR)\/[\d-]+\s*([A-Za-z0-9&.*\-' ]{2,40})/i,
  ];

  for (const re of patterns) {
    const m = body.match(re);
    const g = normalizeMerchant(m?.[1]);
    if (g) {
      return g;
    }
  }

  return null;
}
