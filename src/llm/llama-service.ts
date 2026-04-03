import type { LlamaContext } from "llama.rn";

/** Default stub (web / iOS). Android uses `llama-service.android.ts`. */
export const DEFAULT_MODEL_FILENAME = "expense-llm.gguf";

export function getDefaultModelUri(): string {
  return "";
}

export async function modelFileExists(): Promise<boolean> {
  return false;
}

export async function ensureModelDir(): Promise<void> {}

export async function getOrInitLlama(): Promise<LlamaContext | null> {
  return null;
}

export async function releaseLoadedLlama(): Promise<void> {}
