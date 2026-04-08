import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    getAccountSummaries,
    getMonthCreditTotal,
    getMonthDebitByCategory,
    getMonthDebitTotal,
    type AccountSummary,
    type CategorySlice,
} from "@/db/transactions-repo";
import { formatInr } from "@/lib/format-money";
import { getOrInitLlama, modelFileExists } from "@/llm/llama-service";
import { generateAiTips, generateRuleTips, type SpendingTips } from "@/llm/tips-engine";
import { useDatabase } from "@/providers/database-provider";

export default function InsightsScreen() {
  const db = useDatabase();
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [categories, setCategories] = useState<CategorySlice[]>([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [tips, setTips] = useState<SpendingTips | null>(null);
  const [loadingTips, setLoadingTips] = useState(false);
  const [hasModel, setHasModel] = useState(false);

  const load = useCallback(async () => {
    const [accs, cats, debit, credit, modelReady] = await Promise.all([
      getAccountSummaries(db, y, m),
      getMonthDebitByCategory(db, y, m),
      getMonthDebitTotal(db, y, m),
      getMonthCreditTotal(db, y, m),
      Platform.OS === "android" ? modelFileExists() : Promise.resolve(false),
    ]);
    setAccounts(accs);
    setCategories(cats);
    setTotalDebit(debit);
    setTotalCredit(totalCredit);
    setTotalCredit(credit);
    setHasModel(modelReady);
  }, [db, y, m]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onGetTips = async () => {
    setLoadingTips(true);
    setTips(null);
    try {
      if (hasModel && Platform.OS === "android") {
        const ctx = await getOrInitLlama();
        if (ctx) {
          const result = await generateAiTips(ctx, categories, accounts, totalDebit, totalCredit);
          setTips(result);
          return;
        }
      }
      // Fallback to rule-based tips
      setTips(generateRuleTips(categories, totalDebit, totalCredit));
    } finally {
      setLoadingTips(false);
    }
  };

  const net = totalCredit - totalDebit;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>

      {/* Income vs Spending summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.cardGreen]}>
          <Text style={styles.summaryLabel}>Incoming</Text>
          <Text style={[styles.summaryAmount, styles.textGreen]}>{formatInr(totalCredit)}</Text>
        </View>
        <View style={[styles.summaryCard, styles.cardRed]}>
          <Text style={styles.summaryLabel}>Outgoing</Text>
          <Text style={[styles.summaryAmount, styles.textRed]}>{formatInr(totalDebit)}</Text>
        </View>
      </View>

      <View style={[styles.netRow, net >= 0 ? styles.netPositive : styles.netNegative]}>
        <Text style={styles.netLabel}>Net this month</Text>
        <Text style={styles.netAmount}>
          {net >= 0 ? "+" : ""}{formatInr(net)}
        </Text>
      </View>

      {/* Account breakdown */}
      <Text style={styles.sectionTitle}>By Account / Bank</Text>
      {accounts.length === 0 ? (
        <Text style={styles.empty}>No data yet. Sync SMS first.</Text>
      ) : (
        accounts.map((acc) => <AccountRow key={acc.account} acc={acc} />)
      )}

      {/* AI Tips */}
      <Text style={styles.sectionTitle}>
        Savings Tips {hasModel ? "✨ AI" : ""}
      </Text>

      <Pressable
        style={[styles.button, loadingTips && styles.buttonDisabled]}
        onPress={() => void onGetTips()}
        disabled={loadingTips}
        accessibilityRole="button"
      >
        {loadingTips ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonLabel}>
            {hasModel ? "Get AI Tips" : "Get Tips"}
          </Text>
        )}
      </Pressable>

      {!hasModel && Platform.OS === "android" && (
        <Text style={styles.hint}>
          Add an AI model to get smarter, personalised tips.
        </Text>
      )}

      {tips && (
        <View style={styles.tipsBox}>
          <Text style={styles.tipsSource}>
            {tips.source === "llm" ? "✨ AI-generated tips" : "📋 Smart tips"}
          </Text>
          {tips.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipBullet}>💡</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function AccountRow({ acc }: { acc: AccountSummary }) {
  const net = acc.credit - acc.debit;
  return (
    <View style={styles.accountRow}>
      <View style={styles.accountHeader}>
        <Text style={styles.accountName}>{acc.account}</Text>
        <Text style={[styles.accountNet, net >= 0 ? styles.textGreen : styles.textRed]}>
          {net >= 0 ? "+" : ""}{formatInr(net)}
        </Text>
      </View>
      <View style={styles.accountMeta}>
        <Text style={styles.accountIn}>↑ {formatInr(acc.credit)}</Text>
        <Text style={styles.accountOut}>↓ {formatInr(acc.debit)}</Text>
      </View>
      {/* Simple bar showing debit vs credit ratio */}
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            {
              width: acc.credit + acc.debit > 0
                ? `${Math.round((acc.debit / (acc.credit + acc.debit)) * 100)}%`
                : "0%",
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },

  summaryRow: { flexDirection: "row", gap: 12 },
  summaryCard: {
    flex: 1, borderRadius: 12, padding: 14,
    alignItems: "center",
  },
  cardGreen: { backgroundColor: "#f0fdf4" },
  cardRed: { backgroundColor: "#fef2f2" },
  summaryLabel: { fontSize: 12, color: "#64748b", marginBottom: 4 },
  summaryAmount: { fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] },
  textGreen: { color: "#15803d" },
  textRed: { color: "#b91c1c" },

  netRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", borderRadius: 10, padding: 12,
  },
  netPositive: { backgroundColor: "#f0fdf4" },
  netNegative: { backgroundColor: "#fef2f2" },
  netLabel: { fontSize: 14, color: "#475569" },
  netAmount: { fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"], color: "#0f172a" },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginTop: 8 },
  empty: { fontSize: 14, color: "#94a3b8", textAlign: "center", paddingVertical: 12 },

  accountRow: {
    backgroundColor: "#f8fafc", borderRadius: 10,
    padding: 12, gap: 6,
  },
  accountHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  accountName: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  accountNet: { fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
  accountMeta: { flexDirection: "row", gap: 16 },
  accountIn: { fontSize: 13, color: "#15803d" },
  accountOut: { fontSize: 13, color: "#b91c1c" },
  barBg: { height: 4, backgroundColor: "#e2e8f0", borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, backgroundColor: "#b91c1c", borderRadius: 2 },

  button: {
    backgroundColor: "#6d28d9", paddingVertical: 14,
    borderRadius: 10, alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonLabel: { color: "#fff", fontSize: 16, fontWeight: "600" },

  hint: { fontSize: 12, color: "#94a3b8", textAlign: "center" },

  tipsBox: {
    backgroundColor: "#faf5ff", borderRadius: 12,
    padding: 14, gap: 10, borderWidth: 1, borderColor: "#e9d5ff",
  },
  tipsSource: { fontSize: 12, color: "#7c3aed", fontWeight: "600" },
  tipRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  tipBullet: { fontSize: 16 },
  tipText: { flex: 1, fontSize: 14, color: "#374151", lineHeight: 20 },
});
