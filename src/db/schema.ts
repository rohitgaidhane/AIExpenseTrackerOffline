export const SCHEMA_VERSION = 3;

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

export const MIGRATION_V2 = `
ALTER TABLE transactions ADD COLUMN parse_source TEXT NOT NULL DEFAULT 'regex';
`;

/** v3: track which bank/account the SMS came from */
export const MIGRATION_V3 = `
ALTER TABLE transactions ADD COLUMN account TEXT NOT NULL DEFAULT 'Unknown';
`;
