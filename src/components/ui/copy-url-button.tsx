"use client";

import { useState } from "react";

export function CopyUrlButton({ url, label = "복사" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" className="text-primary" onClick={() => void copy()}>
      {copied ? "복사됨" : label}
    </button>
  );
}
