import { create } from "zustand";

import type { ProcessSmsResult } from "@/sync/process-sms-inbox";

type SmsSyncUiState = {
  busy: boolean;
  progress: string;
  lastError: string | null;
  lastResult: ProcessSmsResult | null;
  setBusy: (v: boolean) => void;
  setProgress: (v: string) => void;
  setLastError: (v: string | null) => void;
  setLastResult: (v: ProcessSmsResult | null) => void;
};

export const useSmsSyncUiStore = create<SmsSyncUiState>((set) => ({
  busy: false,
  progress: "",
  lastError: null,
  lastResult: null,
  setBusy: (busy) => set({ busy }),
  setProgress: (progress) => set({ progress }),
  setLastError: (lastError) => set({ lastError }),
  setLastResult: (lastResult) => set({ lastResult }),
}));
