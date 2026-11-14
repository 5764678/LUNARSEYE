import { create } from "zustand";

import type { Evidence } from "@/shared/api/client";

interface EvidenceState {
  open: { title: string; value?: string; evidence: Evidence } | null;
  show: (title: string, evidence: Evidence, value?: string) => void;
  close: () => void;
}

export const useEvidence = create<EvidenceState>((set) => ({
  open: null,
  show: (title, evidence, value) => set({ open: { title, evidence, value } }),
  close: () => set({ open: null }),
}));
