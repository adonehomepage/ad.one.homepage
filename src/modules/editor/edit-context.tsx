"use client";

import { createContext, useContext } from "react";

export type CanvasEdit = {
  patch: (sectionId: string, content: Record<string, unknown>) => void;
  setPhone: (phone: string) => void;
  setSiteName: (name: string) => void;
  upload: (file: File) => Promise<string>;
  setIntro: (intro: string) => void;
};

export const CanvasEditContext = createContext<CanvasEdit | null>(null);

export function useCanvasEdit() {
  return useContext(CanvasEditContext);
}
