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
  getMonthDebitByCategory,
  getMonthDebitTotal,
} from "@/db/transactions-repo";
import {
  DEFAULT_MODEL_FILENAME,
  getDefaultModelUri,
} from "@/llm/llama-service";
import { formatInr } from "@/lib/format-money";
import { useDatabase } from "@/providers/database-provider";
import { useSmsSyncUiStore } from "@/stores/sms-sync-ui-store";
import { processSmsInbox } from "@/sync/process-sms-inbox";

export default function DashboardScreen() {
  const db = useDatabase();
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  const [monthTotal, setMonthTotal] = useState<number | null>(null);
  const [slices, setSlices] = useState<
    Awaited<ReturnType<typeof getMonthDebitByCategory>>
  >([]);

  const busy = useSmsSyncUiStore((s) => s.busy);
  const progress = useSmsSyncUiStore((s) => s.progress);
  const lastError = useSmsSyncUiStore((s) => s.lastError);
  const lastResult = useSmsSyncUiStore((s) => s.lastResult);
  const setBusy = useSmsSyncUiStore((s) => s.setBusy);
  const setProgress = useSmsSyncUiStore((s) => s.setProgress);
  const setLastError = useSmsSyncUiStore((s) => s.setLastError);
  const setLastResult = useSmsSyncUiStore((s) => s.setLastResult);

  const reload = useCallback(async () => {
    const [total, cats] = await Promise.all([
      getMonthDebitTotal(db, y, m),
      getMonthDebitByCategory(db, y, m),
    ]);
    setMonthTotal(total);
    setSlices(cats);
  }, [db, y, m]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

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

  const modelHint =
    Platform.OS === "android"
      ? `Optional LLM fallback: place a .gguf file at documentDirectory/models/${DEFAULT_MODEL_FILENAME} (see llama.rn docs).`
      : "SMS and on-device LLM run on Android builds only.";

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>This month</Text>
      <Text style={styles.total}>
        {monthTotal === null ? "…" : formatInr(monthTotal)}{" "}
        <Text style={styles.totalHint}>debits</Text>
      </Text>

      <CategoryPieChart slices={slices} size={176} />

      <View style={styles.divider} />

      <Text style={styles.section}>Sync</Text>
      <Text style={styles.body}>
        Process unread + last ~45 days of inbox, skip long digit senders, Regex
        first, then local GGUF if the model file is present.
      </Text>

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
        <Text style={styles.warn}>
          Use an Android development build—Expo Go cannot load native SMS / llama
          in all setups; run `npx expo run:android` after prebuild.
        </Text>
      ) : null}

      {progress ? <Text style={styles.progress}>{progress}</Text> : null}
      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
      {lastResult ? (
        <Text style={styles.body}>
          Last run: scanned {lastResult.scanned}, inserted {lastResult.inserted},
          skipped {lastResult.skipped}, LLM {lastResult.llmParsed}.
        </Text>
      ) : null}

      <Text style={styles.hint}>{modelHint}</Text>
      {Platform.OS === "android" ? (
        <Text style={styles.mono} numberOfLines={2}>
          Model URI: {getDefaultModelUri() || "(native build only)"}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
  },
  total: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0f172a",
  },
  totalHint: {
    fontSize: 16,
    fontWeight: "400",
    color: "#64748b",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#cbd5e1",
    marginVertical: 8,
  },
  section: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
  },
  button: {
    backgroundColor: "#208AEF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  progress: {
    fontSize: 13,
    color: "#0369a1",
  },
  error: {
    fontSize: 14,
    color: "#b91c1c",
  },
  warn: {
    fontSize: 13,
    color: "#b45309",
    lineHeight: 18,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: "#64748b",
    marginTop: 8,
  },
  mono: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: Platform.select({ android: "monospace", ios: "Menlo" }),
  },
});
