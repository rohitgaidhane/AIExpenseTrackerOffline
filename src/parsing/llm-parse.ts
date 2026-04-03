import type { LlamaContext } from "llama.rn";

import { inferCategoryFromText } from "@/parsing/category-infer";
import { extractDateFromSmsBody } from "@/parsing/regex-parse";
import type { ParsedTransaction } from "@/parsing/types";

const SYSTEM_PROMPT = `Extract the expense amount, currency, merchant name, and date from the following SMS. Categorize the expense (e.g., Food, Transport, Utilities). Respond ONLY in valid JSON format with keys: 'amount', 'currency', 'merchant', 'date', 'category', 'type' (credit/debit). Do not include any other text.`;

type LlmJsonShape = {
  amount?: unknown;
  currency?: unknown;
  merchant?: unknown;
  date?: unknown;
  category?: unknown;
  type?: unknown;
};

function normalizeIsoDate(raw: string, fallbackMs?: number): string {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    return t.slice(0, 10);
  }
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
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

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
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const typeRaw = String(data.type ?? "").toLowerCase();
  const type = typeRaw.includes("credit")
    ? "credit"
    : typeRaw.includes("debit")
      ? "debit"
      : null;
  if (!type) {
    return null;
  }

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

  const category =
    typeof data.category === "string" && data.category.trim()
      ? data.category.trim()
      : inferCategoryFromText(merchant, fallbackBody);

  return {
    amount,
    currency,
    merchant,
    date: dateStr,
    category,
    type,
  };
}

/** Layer 2: local GGUF model (llama.rn). */
export async function parseSmsWithLlama(
  context: LlamaContext,
  smsBody: string,
  smsDateMs?: number,
): Promise<ParsedTransaction | null> {
  const body = smsBody.trim();
  if (!body) {
    return null;
  }

  const result = await context.completion({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: body },
    ],
    n_predict: 220,
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  return parsedTransactionFromLlmText(result.text, body, smsDateMs);
}
