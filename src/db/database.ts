import { Platform } from "react-native";

import type { AppDatabase } from "@/db/app-database";

/**
 * Metro inlines `Platform.OS` per target so the unused implementation is dropped
 * (web must not import `expo-sqlite`, which ships without `wa-sqlite.wasm`).
 */
export function getDatabase(): Promise<AppDatabase> {
  if (Platform.OS === "web") {
    return require("./database.web").getDatabase();
  }
  return require("./database.native").getDatabase();
}
