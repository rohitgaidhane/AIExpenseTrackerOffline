import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import { releaseLoadedLlama } from "@/llm/llama-service";
import type { AvailableModel } from "@/stores/model-store";

export function getModelsDir(): string {
  return `${FileSystem.documentDirectory ?? ""}models/`;
}

export function getModelPath(filename: string): string {
  return `${getModelsDir()}${filename}`;
}

/** Public Downloads folder — user can drop the .gguf here directly */
export function getDownloadsPath(filename: string): string {
  return `file:///storage/emulated/0/Download/${filename}`;
}

export async function ensureModelsDir(): Promise<void> {
  await FileSystem.makeDirectoryAsync(getModelsDir(), {
    intermediates: true,
  }).catch(() => {});
}

/**
 * Checks both locations:
 * 1. App private storage  (documentDirectory/models/)
 * 2. Phone Downloads      (/storage/emulated/0/Download/)
 */
export async function checkModelExists(filename: string): Promise<boolean> {
  const appInfo = await FileSystem.getInfoAsync(getModelPath(filename));
  if (appInfo.exists) return true;

  if (Platform.OS === "android") {
    const dlInfo = await FileSystem.getInfoAsync(getDownloadsPath(filename));
    if (dlInfo.exists) return true;
  }

  return false;
}

/**
 * Returns the resolved URI where the model was found, or null.
 */
export async function resolveModelUri(filename: string): Promise<string | null> {
  const appPath = getModelPath(filename);
  const appInfo = await FileSystem.getInfoAsync(appPath);
  if (appInfo.exists) return appPath;

  if (Platform.OS === "android") {
    const dlPath = getDownloadsPath(filename);
    const dlInfo = await FileSystem.getInfoAsync(dlPath);
    if (dlInfo.exists) return dlPath;
  }

  return null;
}

export async function deleteModel(filename: string): Promise<void> {
  await releaseLoadedLlama();
  const path = getModelPath(filename);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}

export function downloadModel(
  model: AvailableModel,
  onProgress: (pct: number) => void,
): FileSystem.DownloadResumable {
  const dest = getModelPath(model.filename);
  return FileSystem.createDownloadResumable(
    model.url,
    dest,
    {},
    (p) => {
      if (p.totalBytesExpectedToWrite > 0) {
        const pct = Math.round(
          (p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100,
        );
        onProgress(pct);
      }
    },
  );
}
