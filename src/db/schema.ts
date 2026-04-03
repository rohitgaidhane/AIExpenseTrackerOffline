/** Increment when applying new migrations in `database.native.ts` / `database.web.ts`. */
export const SCHEMA_VERSION = 1;

/** v1: core transactions table for SMS-derived expenses. */
export const MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sms_id TEXT NOT NULL UNIQUE,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  merchant TEXT,
  date TEXT NOT NULL,
  category TEXT,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category);
`;
