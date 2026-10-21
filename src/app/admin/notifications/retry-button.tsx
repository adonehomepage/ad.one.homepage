"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { orgText } from "@/modules/admin/org-copy";

export function RetryButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function retry() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/notifications/${id}/retry`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? orgText("retryFail"));
        return;
      }
      router.refresh();
    } catch {
      setError(orgText("retryFail"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="soft" loading={loading} loadingLabel={orgText("busy")} onClick={() => void retry()} data-testid="notification-retry">
        {orgText("retry")}
      </Button>
      {error ? (
        <span className="text-xs text-danger" role="alert" aria-live="assertive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
