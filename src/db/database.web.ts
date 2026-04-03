import type {
  SQLiteBindParams,
  SQLiteRunResult,
} from "expo-sqlite";

import type { AppDatabase } from "@/db/app-database";
import { MIGRATION_V1, SCHEMA_VERSION } from "@/db/schema";
import type { TransactionRow } from "@/db/types";

/**
 * In-memory DB for web / `npx expo start` so Metro never loads expo-sqlite's
 * missing wa-sqlite.wasm (npm package issue). Android/iOS use database.native.ts.
 */
class WebMemoryDatabase implements AppDatabase {
  private userVersion = 0;
  private transactions: TransactionRow[] = [];
  private nextId = 1;

  async execAsync(source: string): Promise<void> {
    const setVer = source.match(/PRAGMA\s+user_version\s*=\s*(\d+)/i);
    if (setVer) {
      this.userVersion = Number(setVer[1]);
      return;
    }
    if (source.includes("CREATE TABLE IF NOT EXISTS transactions")) {
      return;
    }
  }

  async getFirstAsync<T>(source: string, params?: SQLiteBindParams): Promise<T | null> {
    const q = source.trim();
    if (/^PRAGMA\s+user_version\s*$/i.test(q)) {
      return { user_version: this.userVersion } as T;
    }
    if (source.includes("COALESCE(SUM(amount)")) {
      const [start, end] = normalizeBind(params) as [string, string];
      let sum = 0;
      for (const t of this.transactions) {
        if (t.type !== "debit") {
          continue;
        }
        if (t.date < start || t.date > end) {
          continue;
        }
        sum += t.amount;
      }
      return { s: sum } as T;
    }
    return null;
  }

  async runAsync(
    source: string,
    params: SQLiteBindParams,
  ): Promise<SQLiteRunResult> {
    const bind = normalizeBind(params);
    if (source.includes("INSERT OR IGNORE")) {
      const [
        sms_id,
        amount,
        currency,
        merchant,
        date,
        category,
        type,
      ] = bind as [
        string,
        number,
        string,
        string | null,
        string,
        string,
        string,
      ];
      if (this.transactions.some((t) => t.sms_id === String(sms_id))) {
        return { changes: 0, lastInsertRowId: 0 };
      }
      const row: TransactionRow = {
        id: this.nextId++,
        sms_id: String(sms_id),
        amount: Number(amount),
        currency: String(currency),
        merchant: merchant == null ? null : String(merchant),
        date: String(date),
        category: category == null ? null : String(category),
        type: type === "credit" ? "credit" : "debit",
      };
      this.transactions.push(row);
      return { changes: 1, lastInsertRowId: row.id };
    }
    return { changes: 0, lastInsertRowId: 0 };
  }

  async getAllAsync<T>(source: string, params?: SQLiteBindParams): Promise<T[]> {
    if (source.includes("GROUP BY category")) {
      const [start, end] = normalizeBind(params) as [string, string];
      const map = new Map<string, number>();
      for (const t of this.transactions) {
        if (t.type !== "debit") {
          continue;
        }
        if (t.date < start || t.date > end) {
          continue;
        }
        const key = t.category ?? "Uncategorized";
        map.set(key, (map.get(key) ?? 0) + t.amount);
      }
      const rows = [...map.entries()]
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);
      return rows as T[];
    }
    if (source.includes("ORDER BY date DESC")) {
      const lim = normalizeBind(params)[0] as number;
      const limit = Number.isFinite(lim) ? lim : 200;
      const sorted = [...this.transactions].sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.id - a.id;
      });
      return sorted.slice(0, limit) as T[];
    }
    return [];
  }
}

function normalizeBind(params?: SQLiteBindParams): unknown[] {
  if (params == null) {
    return [];
  }
  return Array.isArray(params) ? [...params] : [params];
}

let dbInstance: AppDatabase | null = null;
let initPromise: Promise<AppDatabase> | null = null;

async function migrate(database: WebMemoryDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const row = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let version = row?.user_version ?? 0;

  if (version < 1) {
    await database.execAsync(MIGRATION_V1);
  }

  if (version < SCHEMA_VERSION) {
    await database.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
}

export function getDatabase(): Promise<AppDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (!initPromise) {
    initPromise = (async () => {
      const database = new WebMemoryDatabase();
      await migrate(database);
      dbInstance = database;
      return database;
    })();
  }
  return initPromise;
}
