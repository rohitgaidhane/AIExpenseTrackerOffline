import type { SQLiteBindParams, SQLiteRunResult } from "expo-sqlite";

/**
 * Methods the app uses from SQLite. Native uses full `expo-sqlite`; web uses an in-memory shim.
 */
export type AppDatabase = {
  execAsync(source: string): Promise<void>;
  getFirstAsync<T>(
    source: string,
    params?: SQLiteBindParams,
  ): Promise<T | null>;
  runAsync(source: string, params: SQLiteBindParams): Promise<SQLiteRunResult>;
  getAllAsync<T>(
    source: string,
    params?: SQLiteBindParams,
  ): Promise<T[]>;
};
