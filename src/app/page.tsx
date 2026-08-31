import Link from "next/link";
import { brandLabel } from "@/lib/config";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-center">
      <p className="text-sm font-medium text-primary">{brandLabel()}</p>
      <h1 className="mt-3 max-w-xl text-4xl font-bold">분양 홈페이지를 직접 만들고 바로 발행하세요</h1>
      <p className="mt-4 max-w-lg text-text-body">광고사 직원 초대 기반으로 운영됩니다. 공개 회원가입은 없습니다.</p>
      <Link href="/login" className="mt-8 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white">
        직원 로그인
      </Link>
    </div>
  );
}
