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

import { CategoryPieChart } from "@/components/category-pie-chart";
import {
  getMonthCreditTotal,
  getMonthDebitByCategory,
  getMonthDebitTotal,
} from "@/db/transactions-repo";
import { formatInr } from "@/lib/format-money";
import { DEFAULT_MODEL_FILENAME } from "@/llm/llama-service";
import { checkModelExists, getDownloadsPath } from "@/llm/model-manager";
import { useDatabase } from "@/providers/database-provider";
import { useSmsSyncUiStore } from "@/stores/sms-sync-ui-store";
import { processSmsInbox } from "@/sync/process-sms-inbox";

export default function DashboardScreen() {
  const db = useDatabase();
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  const [monthDebit, setMonthDebit] = useState<number | null>(null);
  const [monthCredit, setMonthCredit] = useState<number | null>(null);
  const [slices, setSlices] = useState<Awaited<ReturnType<typeof getMonthDebitByCategory>>>([]);
  const [modelReady, setModelReady] = useState(false);

  const busy = useSmsSyncUiStore((s) => s.busy);
  const progress = useSmsSyncUiStore((s) => s.progress);
  const lastError = useSmsSyncUiStore((s) => s.lastError);
  const lastResult = useSmsSyncUiStore((s) => s.lastResult);
  const setBusy = useSmsSyncUiStore((s) => s.setBusy);
  const setProgress = useSmsSyncUiStore((s) => s.setProgress);
  const setLastError = useSmsSyncUiStore((s) => s.setLastError);
  const setLastResult = useSmsSyncUiStore((s) => s.setLastResult);

  const reload = useCallback(async () => {
    const [debit, credit, cats, modelFound] = await Promise.all([
      getMonthDebitTotal(db, y, m),
      getMonthCreditTotal(db, y, m),
      getMonthDebitByCategory(db, y, m),
      Platform.OS === "android"
        ? checkModelExists(DEFAULT_MODEL_FILENAME)
        : Promise.resolve(false),
    ]);
    setMonthDebit(debit);
    setMonthCredit(credit);
    setSlices(cats);
    setModelReady(modelFound);
  }, [db, y, m]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  const onSync = async () => {
    setLastError(null);
    setBusy(true);
    setProgress("Starting…");
    try {
      const result = await processSmsInbox(db, (msg) => setProgress(msg));
      setLastResult(result);
      await reload();
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>

      {/* Incoming / Outgoing cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.cardGreen]}>
          <Text style={styles.summaryLabel}>Incoming</Text>
          <Text style={[styles.summaryAmount, styles.textGreen]}>
            {monthCredit === null ? "…" : formatInr(monthCredit)}
          </Text>
        </View>
        <View style={[styles.summaryCard, styles.cardRed]}>
          <Text style={styles.summaryLabel}>Outgoing</Text>
          <Text style={[styles.summaryAmount, styles.textRed]}>
            {monthDebit === null ? "…" : formatInr(monthDebit)}
          </Text>
        </View>
      </View>

      <CategoryPieChart slices={slices} size={176} />

      <View style={styles.divider} />

      {/* AI model status */}
      {Platform.OS === "android" ? (
        <View style={styles.modelStatus}>
          <Text style={modelReady ? styles.dotGreen : styles.dotRed}>●</Text>
          <Text style={styles.modelLabel}>
            {modelReady ? "AI model ready" : "AI model not found — regex only"}
          </Text>
        </View>
      ) : null}

      {Platform.OS === "android" && !modelReady ? (
        <Text style={styles.hint}>
          Place <Text style={styles.mono}>expense-llm.gguf</Text> in Downloads:{"\n"}
          <Text style={styles.mono}>{getDownloadsPath(DEFAULT_MODEL_FILENAME)}</Text>
        </Text>
      ) : null}

      <View style={styles.divider} />

      <Text style={styles.section}>Sync SMS</Text>
      <Pressable
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={() => void onSync()}
        disabled={busy || Platform.OS !== "android"}
        accessibilityRole="button"
        accessibilityLabel="Process SMS messages"
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonLabel}>Process / sync SMS</Text>
        )}
      </Pressable>

      {Platform.OS !== "android" ? (
        <Text style={styles.warn}>SMS runs on Android builds only.</Text>
      ) : null}

      {progress ? <Text style={styles.progress}>{progress}</Text> : null}
      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
      {lastResult ? (
        <Text style={styles.body}>
          Scanned {lastResult.scanned} · Saved {lastResult.inserted} · AI parsed {lastResult.llmParsed}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center" },
  cardGreen: { backgroundColor: "#f0fdf4" },
  cardRed: { backgroundColor: "#fef2f2" },
  summaryLabel: { fontSize: 12, color: "#64748b", marginBottom: 4 },
  summaryAmount: { fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  textGreen: { color: "#15803d" },
  textRed: { color: "#b91c1c" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#cbd5e1", marginVertical: 4 },
  section: { fontSize: 16, fontWeight: "600", color: "#334155" },
  body: { fontSize: 14, lineHeight: 20, color: "#475569" },
  button: { backgroundColor: "#208AEF", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  buttonDisabled: { opacity: 0.65 },
  buttonLabel: { color: "#fff", fontSize: 16, fontWeight: "600" },
  progress: { fontSize: 13, color: "#0369a1" },
  error: { fontSize: 14, color: "#b91c1c" },
  warn: { fontSize: 13, color: "#b45309" },
  hint: { fontSize: 12, lineHeight: 18, color: "#64748b" },
  mono: { fontSize: 11, color: "#475569", fontFamily: Platform.select({ android: "monospace", ios: "Menlo" }) },
  modelStatus: { flexDirection: "row", alignItems: "center", gap: 8 },
  dotGreen: { fontSize: 16, color: "#16a34a" },
  dotRed: { fontSize: 16, color: "#dc2626" },
  modelLabel: { fontSize: 14, color: "#334155", flex: 1 },
});
