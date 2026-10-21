"use client";

import { orgText } from "@/modules/admin/org-copy";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 text-center" role="alert">
      <div>
        <p className="text-sm font-medium text-primary">ADONEBRIDGE</p>
        <h1 className="mt-2 text-3xl font-bold">{orgText("errorTitle")}</h1>
        <p className="mt-3 text-text-body">{orgText("errorBody")}</p>
        <Button className="mt-8" type="button" onClick={() => reset()}>
          {orgText("errorRetry")}
        </Button>
      </div>
    </main>
  );
}
