import type { LlamaContext } from "@pocketpalai/llama.rn";

/** Web / iOS stub — Android uses llama-service.android.ts */
export const DEFAULT_MODEL_FILENAME = "expense-llm.gguf";

export function getDefaultModelUri(): string { return ""; }
export function getDownloadsModelUri(): string { return ""; }
export async function findModelUri(): Promise<string | null> { return null; }
export async function modelFileExists(): Promise<boolean> { return false; }
export async function ensureModelDir(): Promise<void> {}
export async function getOrInitLlama(): Promise<LlamaContext | null> { return null; }
export async function releaseLoadedLlama(): Promise<void> {}
