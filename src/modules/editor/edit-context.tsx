"use client";

import { createContext, useContext } from "react";
import type { PageSnapshot } from "@/types";

export type CanvasEdit = {
  patch: (sectionId: string, content: Record<string, unknown>) => void;
  setPhone: (phone: string) => void;
  setSiteName: (name: string) => void;
  setNavSubtitle: (subtitle: string) => void;
  setLogo: (logoUrl: string) => void;
  upload: (file: File) => Promise<string>;
  setIntro: (intro: string) => void;
  setSuccessMessage: (message: string) => void;
  setSuccessTitle: (title: string) => void;
  setAgainLabel: (label: string) => void;
  setSubmittingLabel: (label: string) => void;
  setPreviewNote: (note: string) => void;
  setShareLabel: (label: string) => void;
  setPageCopy: (patch: Record<string, unknown>) => void;
  setPrivacy: (privacy: PageSnapshot["privacy"]) => void;
  setFields: (fields: PageSnapshot["formSettings"]["fields"]) => void;
  setPopup: (popup: Record<string, unknown>) => void;
};

export const CanvasEditContext = createContext<CanvasEdit | null>(null);

export const EditorChromeContext = createContext<Record<string, string>>({});

export function useEditorChrome() {
  return useContext(EditorChromeContext);
}

export function chromeText(source: Record<string, unknown> | undefined, key: string, fallback: string) {
  return String(source?.[key] ?? "").trim() || fallback;
}

export function useCanvasEdit() {
  return useContext(CanvasEditContext);
}
