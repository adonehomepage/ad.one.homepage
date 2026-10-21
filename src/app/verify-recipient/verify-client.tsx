"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { orgText } from "@/modules/admin/org-copy";

export function VerifyRecipientClient({ brandName }: { brandName: string }) {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "ok" | "fail">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("fail");
      setMessage(orgText("recipientVerifyInvalid"));
      return;
    }
    void fetch(`/api/public/recipients/verify?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus("fail");
          setMessage(json.message ?? orgText("recipientVerifyInvalid"));
          return;
        }
        setStatus("ok");
        setMessage(json.message ?? orgText("recipientVerified"));
      })
      .catch(() => {
        setStatus("fail");
        setMessage(orgText("recipientVerifyInvalid"));
      });
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 text-center">
      <div className="w-full max-w-md space-y-4 ui-card">
        <p className="text-sm font-medium text-primary">{brandName}</p>
        <h1 className="text-2xl font-bold">
          {status === "loading" ? orgText("loginLoading") : status === "ok" ? orgText("recipientVerifiedTitle") : orgText("recipientVerifyFailTitle")}
        </h1>
        {message ? (
          <p
            className={`text-sm ${status === "fail" ? "text-danger" : "text-text-body"}`}
            role={status === "fail" ? "alert" : "status"}
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}
        <Link href="/" className="inline-flex h-12 items-center justify-center rounded-[14px] border border-border bg-white px-5 text-[17px] font-semibold text-text-body">
          {orgText("publicHome")}
        </Link>
      </div>
    </main>
  );
}
