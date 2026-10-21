"use client";

import { orgText } from "@/modules/admin/org-copy";
import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4 py-16 text-center" role="alert">
      <h1 className="text-3xl font-bold">{orgText("errorTitle")}</h1>
      <p className="text-text-body">{orgText("errorBody")}</p>
      <Button type="button" onClick={() => reset()}>
        {orgText("errorRetry")}
      </Button>
    </div>
  );
}
