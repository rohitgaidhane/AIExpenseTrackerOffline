import { Platform } from "react-native";

import type { AppDatabase } from "@/db/app-database";
import { insertTransactionParsed } from "@/db/transactions-repo";
import { getOrInitLlama, modelFileExists, releaseLoadedLlama } from "@/llm/llama-service";
import { parseSmsWithLlama } from "@/parsing/llm-parse";
import { parseSmsWithRegex } from "@/parsing/regex-parse";
import { extractAccountFromSender } from "@/sms/extract-account";
import { loadCandidateTransactionalSms } from "@/sms/load-inbox";
import { ensureReadSmsPermission } from "@/sms/sms-permission";
import type { AndroidSmsRecord } from "@/sms/types";

export type ProcessSmsResult = {
  scanned: number;
  inserted: number;
  skipped: number;
  llmParsed: number;
};

export async function processSmsInbox(
  db: AppDatabase,
  onProgress?: (message: string) => void,
): Promise<ProcessSmsResult> {
  if (Platform.OS !== "android") {
    onProgress?.("SMS is only available on Android.");
    return { scanned: 0, inserted: 0, skipped: 0, llmParsed: 0 };
  }

  const ok = await ensureReadSmsPermission();
  if (!ok) throw new Error("READ_SMS permission was denied.");

  onProgress?.("Reading inbox…");
  const rows = await loadCandidateTransactionalSms();
  onProgress?.(`Parsing ${rows.length} messages…`);

  let inserted = 0;
  let skipped = 0;
  let llmParsed = 0;
  const forLlm: AndroidSmsRecord[] = [];

  for (const row of rows) {
    const ms = Number(row.date);
    const account = extractAccountFromSender(row.address ?? "");
    const parsed = parseSmsWithRegex(row.body, Number.isFinite(ms) ? ms : undefined);
    if (parsed) {
      const added = await insertTransactionParsed(db, String(row._id), parsed, "regex", account);
      if (added) inserted += 1;
      else skipped += 1;
    } else {
      forLlm.push(row);
    }
  }

  const canLlm = forLlm.length > 0 && (await modelFileExists());

  if (canLlm) {
    onProgress?.(`Running AI on ${forLlm.length} unmatched messages…`);
    const ctx = await getOrInitLlama();
    try {
      if (ctx) {
        for (const row of forLlm) {
          const ms = Number(row.date);
          const account = extractAccountFromSender(row.address ?? "");
          const parsed = await parseSmsWithLlama(ctx, row.body, Number.isFinite(ms) ? ms : undefined);
          if (parsed) {
            const added = await insertTransactionParsed(db, String(row._id), parsed, "llm", account);
            if (added) { inserted += 1; llmParsed += 1; }
            else skipped += 1;
          } else {
            skipped += 1;
          }
        }
      } else {
        skipped += forLlm.length;
      }
    } finally {
      await releaseLoadedLlama();
    }
  } else {
    skipped += forLlm.length;
  }

  onProgress?.("Done.");
  return { scanned: rows.length, inserted, skipped, llmParsed };
}
