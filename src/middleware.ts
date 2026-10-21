import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const requestId = request.headers.get("x-request-id")?.trim() || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname + search);
  requestHeaders.set("x-request-id", requestId);
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname.startsWith("/admin") && !hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(login);
    redirect.headers.set("X-Request-Id", requestId);
    return redirect;
  }

  // /login 쿠키 존재 시 리다이렉트는 page의 getAuthContext로만 처리
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("X-Request-Id", requestId);
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/api/:path*"],
};
