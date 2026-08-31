"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function MemberActions({
  memberId,
  status,
  role,
}: {
  memberId: string;
  status: string;
  role: string;
}) {
  const router = useRouter();

  async function post(action?: string, body?: unknown) {
    const url = action ? `/api/members/${memberId}?action=${action}` : `/api/members/${memberId}`;
    await fetch(url, {
      method: action ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-1">
      {status === "ACTIVE" ? (
        <Button variant="danger" type="button" onClick={() => post("suspend")}>
          정지
        </Button>
      ) : (
        <Button variant="soft" type="button" onClick={() => post("reactivate")}>
          재활성화
        </Button>
      )}
      {role === "SYSTEM_ADMIN" ? (
        <Button variant="ghost" type="button" onClick={() => post(undefined, { role: "MEMBER" })}>
          관리자 해제
        </Button>
      ) : (
        <Button variant="ghost" type="button" onClick={() => post(undefined, { role: "SYSTEM_ADMIN" })}>
          관리자 지정
        </Button>
      )}
    </div>
  );
}
