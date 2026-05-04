import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { listRecentTransactions } from "@/db/transactions-repo";
import type { TransactionRow } from "@/db/types";
import { formatInr } from "@/lib/format-money";
import { useDatabase } from "@/providers/database-provider";

const CATEGORY_EMOJI: Record<string, string> = {
  Food: "🍔",
  Transport: "🚗",
  Utilities: "💡",
  Shopping: "🛍️",
  Entertainment: "🎬",
  Health: "💊",
  Education: "📚",
  Cash: "💵",
  Transfers: "↔️",
  Other: "📋",
  Uncategorized: "📋",
  "Credit Card": "💳",
  Swiggy: "🍽️",
  Zomato: "🍕",
  MedPlus: "💊",
  Instamart: "🛒",
  Jiomart: "🏪",
  // Add more as needed
};

// ─── types for the flat list ────────────────────────────────────────────────

type DateHeader = {
  kind: "header";
  date: string;
  totalDebit: number;
  totalCredit: number;
};

type TxItem = {
  kind: "tx";
  tx: TransactionRow;
};

type ListItem = DateHeader | TxItem;

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dt.toDateString() === today.toDateString()) return "Today";
  if (dt.toDateString() === yesterday.toDateString()) return "Yesterday";

  return dt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: dt.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function groupByDate(rows: TransactionRow[]): ListItem[] {
  const groups = new Map<string, TransactionRow[]>();
  for (const row of rows) {
    const key = row.date;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const items: ListItem[] = [];
  for (const [date, txs] of groups) {
    const totalDebit = txs
      .filter((t) => t.type === "debit")
      .reduce((s, t) => s + t.amount, 0);
    const totalCredit = txs
      .filter((t) => t.type === "credit")
      .reduce((s, t) => s + t.amount, 0);

    items.push({ kind: "header", date, totalDebit, totalCredit });
    for (const tx of txs) {
      items.push({ kind: "tx", tx });
    }
  }
  return items;
}

// ─── screen ─────────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const db = useDatabase();
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const list = await listRecentTransactions(db, 500);
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

  const toggleCollapse = (date: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  // Build flat list — skip tx rows for collapsed dates
  const listData = useMemo<ListItem[]>(() => {
    const all = groupByDate(rows);
    return all.filter(
      (item) => item.kind === "header" || !collapsed.has(item.tx.date),
    );
  }, [rows, collapsed]);

  return (
    <FlatList
      data={listData}
      keyExtractor={(item) =>
        item.kind === "header" ? `hdr-${item.date}` : `tx-${item.tx.id}`
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
        />
      }
      contentContainerStyle={styles.listPad}
      ListEmptyComponent={
        <Text style={styles.empty}>
          No transactions yet.{"\n"}Tap "Process / sync SMS" on the dashboard.
        </Text>
      }
      renderItem={({ item }) =>
        item.kind === "header" ? (
          <DateHeaderRow
            item={item}
            collapsed={collapsed.has(item.date)}
            onToggle={() => toggleCollapse(item.date)}
          />
        ) : (
          <TransactionItem item={item.tx} />
        )
      }
    />
  );
}

// ─── date header ─────────────────────────────────────────────────────────────

function DateHeaderRow({
  item,
  collapsed,
  onToggle,
}: {
  item: DateHeader;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      style={styles.dateHeader}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`Toggle ${item.date}`}
    >
      <View style={styles.dateLeft}>
        <Text style={styles.dateLabel}>{formatDisplayDate(item.date)}</Text>
        <Text style={styles.dateIso}>{item.date}</Text>
      </View>
      <View style={styles.dateTotals}>
        {item.totalCredit > 0 && (
          <Text style={styles.dateCredit}>+{formatInr(item.totalCredit)}</Text>
        )}
        {item.totalDebit > 0 && (
          <Text style={styles.dateDebit}>−{formatInr(item.totalDebit)}</Text>
        )}
        <Text style={styles.chevron}>{collapsed ? "›" : "⌄"}</Text>
      </View>
    </Pressable>
  );
}

// ─── transaction row ─────────────────────────────────────────────────────────

function TransactionItem({ item }: { item: TransactionRow }) {
  const emoji = CATEGORY_EMOJI[item.category ?? "Other"] ?? "📋";
  const isDebit = item.type === "debit";

  return (
    <View style={styles.row}>
      <View style={styles.iconCol}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.infoCol}>
        <View style={styles.rowTop}>
          <Text style={styles.merchant} numberOfLines={1}>
            {item.merchant ?? item.category ?? "Unknown"}
          </Text>
          <Text style={[styles.amount, isDebit ? styles.debit : styles.credit]}>
            {isDebit ? "−" : "+"}
            {formatInr(item.amount)}
          </Text>
        </View>
        <View style={styles.rowMeta}>
          <Text style={styles.meta}>{item.account}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{item.category ?? "Other"}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text
            style={[
              styles.badge,
              item.parse_source === "llm" ? styles.badgeAi : styles.badgeRegex,
            ]}
          >
            {item.parse_source === "llm" ? "AI" : "auto"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listPad: { paddingBottom: 32, flexGrow: 1 },
  empty: {
    textAlign: "center",
    marginTop: 48,
    color: "#64748b",
    fontSize: 15,
    lineHeight: 24,
    paddingHorizontal: 24,
  },

  // date header
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    marginTop: 8,
  },
  dateLeft: { gap: 1 },
  dateLabel: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  dateIso: { fontSize: 11, color: "#94a3b8" },
  dateTotals: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateCredit: {
    fontSize: 13,
    fontWeight: "600",
    color: "#15803d",
    fontVariant: ["tabular-nums"],
  },
  dateDebit: {
    fontSize: 13,
    fontWeight: "600",
    color: "#b91c1c",
    fontVariant: ["tabular-nums"],
  },
  chevron: { fontSize: 16, color: "#94a3b8", marginLeft: 4 },

  // transaction row
  row: {
    flexDirection: "row",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  iconCol: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 18 },
  infoCol: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  merchant: { flex: 1, fontSize: 15, fontWeight: "600", color: "#0f172a" },
  amount: { fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
  debit: { color: "#b91c1c" },
  credit: { color: "#15803d" },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  meta: { fontSize: 12, color: "#64748b" },
  metaDot: { fontSize: 12, color: "#cbd5e1" },
  badge: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
    fontFamily: Platform.select({ android: "monospace", ios: "Menlo" }),
  },
  badgeAi: { backgroundColor: "#ede9fe", color: "#6d28d9" },
  badgeRegex: { backgroundColor: "#f0fdf4", color: "#15803d" },
});
