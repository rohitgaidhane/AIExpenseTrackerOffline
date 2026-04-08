import type { LlamaContext } from "@pocketpalai/llama.rn";

import { inferCategoryFromText } from "@/parsing/category-infer";
import { extractDateFromSmsBody } from "@/parsing/regex-parse";
import type { ParsedTransaction } from "@/parsing/types";

// More detailed prompt — LLM only sees messages regex couldn't parse,
// so we push it harder on merchant extraction and category.
const SYSTEM_PROMPT = `You are a financial SMS parser for Indian bank messages.
Extract transaction data and respond ONLY in valid JSON with these exact keys:
- "amount": number (e.g. 450.00)
- "currency": string (default "INR")
- "merchant": string or null (shop/service name, not bank name)
- "date": string (YYYY-MM-DD format)
- "category": one of: Food, Transport, Utilities, Shopping, Entertainment, Health, Education, Cash, Transfers, Other
- "type": "debit" or "credit"

Rules:
- For "merchant": extract the actual payee/shop name. If UPI, extract the VPA handle name part.
- For "category": use context clues from merchant name and SMS body.
- If amount or type cannot be determined, still return valid JSON with amount: 0.
- Do NOT include any explanation, markdown, or text outside the JSON object.`;

type LlmJsonShape = {
  amount?: unknown;
  currency?: unknown;
  merchant?: unknown;
  date?: unknown;
  category?: unknown;
  type?: unknown;
};

const VALID_CATEGORIES = new Set([
  "Food", "Transport", "Utilities", "Shopping",
  "Entertainment", "Health", "Education", "Cash", "Transfers", "Other",
]);

function normalizeIsoDate(raw: string, fallbackMs?: number): string {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  return extractDateFromSmsBody(t, fallbackMs);
}

export function parsedTransactionFromLlmText(
  text: string,
  fallbackBody: string,
  smsDateMs?: number,
): ParsedTransaction | null {
  const cleaned = text.replace(/```json\s*|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  let data: LlmJsonShape;
  try {
    data = JSON.parse(cleaned.slice(start, end + 1)) as LlmJsonShape;
  } catch {
    return null;
  }

  const amountRaw = data.amount;
  const amount =
    typeof amountRaw === "number"
      ? amountRaw
      : typeof amountRaw === "string"
        ? Number.parseFloat(amountRaw.replace(/,/g, ""))
        : NaN;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const typeRaw = String(data.type ?? "").toLowerCase();
  const type = typeRaw.includes("credit")
    ? "credit"
    : typeRaw.includes("debit")
      ? "debit"
      : null;
  if (!type) return null;

  const currency =
    typeof data.currency === "string" && data.currency.trim()
      ? data.currency.trim().toUpperCase()
      : "INR";

  const merchant =
    typeof data.merchant === "string" && data.merchant.trim()
      ? data.merchant.trim().slice(0, 200)
      : null;

  const dateStr =
    typeof data.date === "string"
      ? normalizeIsoDate(data.date, smsDateMs)
      : extractDateFromSmsBody(fallbackBody, smsDateMs);

  // Validate LLM category, fall back to our own inference if invalid
  const llmCategory =
    typeof data.category === "string" && VALID_CATEGORIES.has(data.category.trim())
      ? data.category.trim()
      : inferCategoryFromText(merchant, fallbackBody);

  return { amount, currency, merchant, date: dateStr, category: llmCategory, type };
}

/** Layer 2: local GGUF model via llama.rn */
export async function parseSmsWithLlama(
  context: LlamaContext,
  smsBody: string,
  smsDateMs?: number,
): Promise<ParsedTransaction | null> {
  const body = smsBody.trim();
  if (!body) return null;

  const result = await context.completion({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: body },
    ],
    n_predict: 256,
    temperature: 0.1, // lower = more deterministic JSON
    response_format: { type: "json_object" },
  });

  return parsedTransactionFromLlmText(result.text, body, smsDateMs);
}
