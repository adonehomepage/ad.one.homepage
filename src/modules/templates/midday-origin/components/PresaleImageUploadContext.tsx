"use client";

import { createContext, useContext } from "react";

export type PresaleImageUploadContextValue = {
  projectId: string | null;
  onUploadError?: (message: string) => void;
  beginUpload: () => void;
  endUpload: () => void;
  waitForUploads: () => Promise<void>;
};

export const PresaleImageUploadContext = createContext<PresaleImageUploadContextValue | null>(
  null
);

export function usePresaleImageUpload() {
  return useContext(PresaleImageUploadContext);
}
