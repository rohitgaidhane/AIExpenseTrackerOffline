import { create } from "zustand";

export type ModelStatus = "not_downloaded" | "downloading" | "ready" | "error";

export type AvailableModel = {
  id: string;
  name: string;
  description: string;
  sizeMb: number;
  url: string;
  filename: string;
};

export const AVAILABLE_MODELS: AvailableModel[] = [
  {
    id: "qwen2.5-0.5b",
    name: "Qwen 2.5 0.5B (Recommended)",
    description: "Fastest, lowest RAM (~400MB). Best for most phones.",
    sizeMb: 400,
    url: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf",
    filename: "expense-llm.gguf",
  },
  {
    id: "gemma-2b",
    name: "Gemma 2 2B",
    description: "More accurate, needs ~1.5GB RAM. Better for complex SMS.",
    sizeMb: 1500,
    url: "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf",
    filename: "expense-llm.gguf",
  },
];

type ModelState = {
  status: ModelStatus;
  downloadProgress: number; // 0–100
  activeModelId: string | null;
  errorMessage: string | null;
  setStatus: (status: ModelStatus) => void;
  setProgress: (progress: number) => void;
  setActiveModel: (id: string | null) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
};

export const useModelStore = create<ModelState>((set) => ({
  status: "not_downloaded",
  downloadProgress: 0,
  activeModelId: null,
  errorMessage: null,
  setStatus: (status) => set({ status }),
  setProgress: (downloadProgress) => set({ downloadProgress }),
  setActiveModel: (activeModelId) => set({ activeModelId }),
  setError: (errorMessage) => set({ errorMessage }),
  reset: () =>
    set({
      status: "not_downloaded",
      downloadProgress: 0,
      errorMessage: null,
    }),
}));
