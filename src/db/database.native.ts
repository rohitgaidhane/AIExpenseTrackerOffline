import * as SQLite from "expo-sqlite";

import type { AppDatabase } from "@/db/app-database";
import { MIGRATION_V1, SCHEMA_VERSION } from "@/db/schema";

const DB_NAME = "expense_tracker.db";

let dbInstance: AppDatabase | null = null;
let initPromise: Promise<AppDatabase> | null = null;

async function migrate(database: AppDatabase) {
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

/**
 * Opens (or returns) the app SQLite database and runs migrations.
 * Safe to call from multiple places; initialization runs once.
 */
export function getDatabase(): Promise<AppDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (!initPromise) {
    initPromise = (async () => {
      const database = (await SQLite.openDatabaseAsync(
        DB_NAME,
      )) as AppDatabase;
      await migrate(database);
      dbInstance = database;
      return database;
    })();
  }
  return initPromise;
}
