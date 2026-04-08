import * as FileSystem from "expo-file-system/legacy";
import { initLlama, type LlamaContext } from "llama.rn";

export const DEFAULT_MODEL_FILENAME = "expense-llm.gguf";

let activeContext: LlamaContext | null = null;

export function getDefaultModelUri(): string {
  const base = FileSystem.documentDirectory ?? "";
  return `${base}models/${DEFAULT_MODEL_FILENAME}`;
}

// Android public Downloads folder — user can drop the .gguf here directly
export function getDownloadsModelUri(): string {
  return `file:///storage/emulated/0/Download/${DEFAULT_MODEL_FILENAME}`;
}

export async function ensureModelDir(): Promise<void> {
  const base = FileSystem.documentDirectory;
  if (!base) return;
  await FileSystem.makeDirectoryAsync(`${base}models`, {
    intermediates: true,
  }).catch(() => {});
}

/**
 * Finds the model in priority order:
 * 1. App private storage  →  documentDirectory/models/expense-llm.gguf
 * 2. Phone Downloads      →  /storage/emulated/0/Download/expense-llm.gguf
 */
export async function findModelUri(): Promise<string | null> {
  const appPath = getDefaultModelUri();
  const appInfo = await FileSystem.getInfoAsync(appPath);
  if (appInfo.exists) return appPath;

  const dlPath = getDownloadsModelUri();
  const dlInfo = await FileSystem.getInfoAsync(dlPath);
  if (dlInfo.exists) return dlPath;

  return null;
}

export async function modelFileExists(): Promise<boolean> {
  return (await findModelUri()) !== null;
}

/**
 * Load quantized .gguf — checks app storage first, then Downloads folder.
 */
export async function getOrInitLlama(): Promise<LlamaContext | null> {
  if (activeContext) return activeContext;

  const modelUri = await findModelUri();
  if (!modelUri) return null;

  try {
    activeContext = await initLlama({
      model: modelUri,
      use_mlock: false,
      n_ctx: 2048,
      n_gpu_layers: 0,
    });
    return activeContext;
  } catch {
    activeContext = null;
    return null;
  }
}

export async function releaseLoadedLlama(): Promise<void> {
  if (!activeContext) return;
  try {
    await activeContext.release();
  } catch {
    /* ignore */
  }
  activeContext = null;
}
