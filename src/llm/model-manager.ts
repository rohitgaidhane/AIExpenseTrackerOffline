import type { AvailableModel } from "@/stores/model-store";

/** Web / iOS stub — no filesystem access */
export function getModelsDir(): string { return ""; }
export function getModelPath(_filename: string): string { return ""; }
export function getDownloadsPath(_filename: string): string { return ""; }
export async function ensureModelsDir(): Promise<void> {}
export async function checkModelExists(_filename: string): Promise<boolean> { return false; }
export async function resolveModelUri(_filename: string): Promise<string | null> { return null; }
export async function deleteModel(_filename: string): Promise<void> {}
export function downloadModel(
  _model: AvailableModel,
  _onProgress: (pct: number) => void,
): { downloadAsync: () => Promise<null> } {
  return { downloadAsync: async () => null };
}
