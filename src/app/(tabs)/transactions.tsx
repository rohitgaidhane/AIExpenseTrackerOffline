import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import type { TransactionRow } from "@/db/types";
import { listRecentTransactions } from "@/db/transactions-repo";
import { formatInr } from "@/lib/format-money";
import { useDatabase } from "@/providers/database-provider";

export default function TransactionsScreen() {
  const db = useDatabase();
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const list = await listRecentTransactions(db, 250);
    setRows(list);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
      }
      contentContainerStyle={styles.listPad}
      ListEmptyComponent={
        <Text style={styles.empty}>
          No transactions yet. Use “Process / sync SMS” on the dashboard.
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.rowTop}>
            <Text style={styles.merchant} numberOfLines={1}>
              {item.merchant ?? item.category}
            </Text>
            <Text
              style={[
                styles.amount,
                item.type === "debit" ? styles.debit : styles.credit,
              ]}
            >
              {item.type === "debit" ? "−" : "+"}
              {formatInr(item.amount)}
            </Text>
          </View>
          <View style={styles.rowMeta}>
            <Text style={styles.meta}>{item.date}</Text>
            <Text style={styles.meta}>{item.category}</Text>
            <Text style={styles.meta}>{item.type}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listPad: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  empty: {
    textAlign: "center",
    marginTop: 48,
    color: "#64748b",
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  merchant: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  debit: {
    color: "#b91c1c",
  },
  credit: {
    color: "#15803d",
  },
  rowMeta: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  meta: {
    fontSize: 12,
    color: "#64748b",
  },
});
