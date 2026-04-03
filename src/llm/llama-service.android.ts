import * as FileSystem from "expo-file-system/legacy";
import { initLlama, type LlamaContext } from "llama.rn";

export const DEFAULT_MODEL_FILENAME = "expense-llm.gguf";

let activeContext: LlamaContext | null = null;

export function getDefaultModelUri(): string {
  const base = FileSystem.documentDirectory ?? "";
  return `${base}models/${DEFAULT_MODEL_FILENAME}`;
}

export async function ensureModelDir(): Promise<void> {
  const base = FileSystem.documentDirectory;
  if (!base) {
    return;
  }
  await FileSystem.makeDirectoryAsync(`${base}models`, {
    intermediates: true,
  }).catch(() => {});
}

export async function modelFileExists(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(getDefaultModelUri());
  return info.exists;
}

/**
 * Load quantized `.gguf` from `documentDirectory/models/expense-llm.gguf`.
 */
export async function getOrInitLlama(): Promise<LlamaContext | null> {
  if (activeContext) {
    return activeContext;
  }
  if (!(await modelFileExists())) {
    return null;
  }
  await ensureModelDir();
  try {
    activeContext = await initLlama({
      model: getDefaultModelUri(),
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
  if (!activeContext) {
    return;
  }
  try {
    await activeContext.release();
  } catch {
    /* ignore */
  }
  activeContext = null;
}
