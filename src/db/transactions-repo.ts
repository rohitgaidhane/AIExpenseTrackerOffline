import type { AppDatabase } from "@/db/app-database";
import type { TransactionRow } from "@/db/types";
import type { ParsedTransaction } from "@/parsing/types";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function monthRangeIso(year: number, month1To12: number): { start: string; end: string } {
  const start = `${year}-${pad2(month1To12)}-01`;
  const last = new Date(year, month1To12, 0).getDate();
  const end = `${year}-${pad2(month1To12)}-${pad2(last)}`;
  return { start, end };
}

export async function insertTransactionParsed(
  db: AppDatabase,
  smsId: string,
  parsed: ParsedTransaction,
): Promise<boolean> {
  const res = await db.runAsync(
    `INSERT OR IGNORE INTO transactions (sms_id, amount, currency, merchant, date, category, type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      smsId,
      parsed.amount,
      parsed.currency,
      parsed.merchant,
      parsed.date,
      parsed.category,
      parsed.type,
    ],
  );
  return (res.changes ?? 0) > 0;
}

export async function getMonthDebitTotal(
  db: AppDatabase,
  year: number,
  month: number,
): Promise<number> {
  const { start, end } = monthRangeIso(year, month);
  const row = await db.getFirstAsync<{ s: number | null }>(
    `SELECT COALESCE(SUM(amount), 0) AS s FROM transactions
     WHERE type = 'debit' AND date >= ? AND date <= ?`,
    [start, end],
  );
  return row?.s ?? 0;
}

export type CategorySlice = { category: string; total: number };

export async function getMonthDebitByCategory(
  db: AppDatabase,
  year: number,
  month: number,
): Promise<CategorySlice[]> {
  const { start, end } = monthRangeIso(year, month);
  const rows = await db.getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(amount) AS total FROM transactions
     WHERE type = 'debit' AND date >= ? AND date <= ?
     GROUP BY category
     ORDER BY total DESC`,
    [start, end],
  );
  return rows ?? [];
}

export async function listRecentTransactions(
  db: AppDatabase,
  limit = 200,
): Promise<TransactionRow[]> {
  return db.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions ORDER BY date DESC, id DESC LIMIT ?`,
    [limit],
  );
}
