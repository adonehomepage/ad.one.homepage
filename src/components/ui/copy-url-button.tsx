"use client";

import { useState } from "react";
import { orgText } from "@/modules/admin/org-copy";

export function CopyUrlButton({ url, label = orgText("copy"), copiedLabel = orgText("copied") }: { url: string; label?: string; copiedLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    setFailed(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setFailed(true);
      window.setTimeout(() => setFailed(false), 2000);
    }
  }

  return (
    <button
      type="button"
      className="text-primary"
      onClick={() => void copy()}
      aria-label={copied ? copiedLabel : label}
      aria-live="polite"
    >
      {failed ? orgText("copyFail") : copied ? copiedLabel : label}
    </button>
  );
}
