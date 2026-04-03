/** Row shape for the `transactions` table (SQLite). */
export type TransactionRow = {
  id: number;
  sms_id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  date: string;
  category: string | null;
  type: "credit" | "debit";
};

export type TransactionInsert = Omit<TransactionRow, "id">;
