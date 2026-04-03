import SmsAndroid from "react-native-get-sms-android";

import { looksLikePersonalNumber } from "@/sms/filter-senders";
import type { AndroidSmsRecord } from "@/sms/types";

const RECENT_WINDOW_MS = 45 * 24 * 60 * 60 * 1000;
const MAX_RECENT_BATCH = 400;
const MAX_UNREAD_BATCH = 150;

function listSms(filter: Record<string, unknown>): Promise<AndroidSmsRecord[]> {
  return new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify(filter),
      (err) => {
        reject(new Error(err ?? "SMS list failed"));
      },
      (_count, smsList) => {
        if (!smsList) {
          resolve([]);
          return;
        }
        try {
          resolve(JSON.parse(smsList) as AndroidSmsRecord[]);
        } catch {
          resolve([]);
        }
      },
    );
  });
}

export async function loadCandidateTransactionalSms(): Promise<
  AndroidSmsRecord[]
> {
  const now = Date.now();
  const minDate = now - RECENT_WINDOW_MS;

  const [recent, unread] = await Promise.all([
    listSms({
      box: "inbox",
      minDate,
      maxCount: MAX_RECENT_BATCH,
      indexFrom: 0,
    }),
    listSms({
      box: "inbox",
      read: 0,
      maxCount: MAX_UNREAD_BATCH,
      indexFrom: 0,
    }),
  ]);

  const byId = new Map<string, AndroidSmsRecord>();
  for (const row of [...unread, ...recent]) {
    byId.set(String(row._id), row);
  }

  return [...byId.values()].filter(
    (row) => row.body?.trim() && !looksLikePersonalNumber(row.address ?? ""),
  );
}
