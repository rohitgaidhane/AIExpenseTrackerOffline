import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import type { AppDatabase } from "@/db/app-database";
import { getDatabase } from "@/db/database";

const DatabaseContext = createContext<AppDatabase | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [database, setDatabase] = useState<AppDatabase | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const db = await getDatabase();
      if (!cancelled) {
        setDatabase(db);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!database) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" accessibilityLabel="Loading database" />
      </View>
    );
  }

  return (
    <DatabaseContext.Provider value={database}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): AppDatabase {
  const ctx = useContext(DatabaseContext);
  if (!ctx) {
    throw new Error("useDatabase must be used within DatabaseProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
