"use client";

import { Button } from "@/components/ui/button";

export function RetryButton({ id }: { id: string }) {
  return (
    <Button
      variant="soft"
      onClick={async () => {
        await fetch(`/api/notifications/${id}/retry`, { method: "POST" });
        window.location.reload();
      }}
    >
      재시도
    </Button>
  );
}
