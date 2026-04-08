export type TransactionRow = {
  id: number;
  sms_id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  date: string;
  category: string | null;
  type: "credit" | "debit";
  parse_source: "regex" | "llm";
  account: string;
};

export type TransactionInsert = Omit<TransactionRow, "id">;
