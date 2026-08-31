import { appConfig } from "@/lib/config";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">개인정보 처리방침</h1>
      <p className="mt-6 text-text-body">
        실제 처리 주체와 전문은 법인명 확정 후 법무 검토를 거쳐 교체해야 합니다. 현재 표시명: {appConfig.privacyControllerName || "출시 전 확정 필요"}.
      </p>
    </main>
  );
}
