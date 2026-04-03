/** Normalized parse result saved to SQLite (and produced by regex or LLM). */
export type ParsedTransaction = {
  amount: number;
  currency: string;
  merchant: string | null;
  /** ISO calendar date YYYY-MM-DD (local inference). */
  date: string;
  category: string;
  type: "credit" | "debit";
};
