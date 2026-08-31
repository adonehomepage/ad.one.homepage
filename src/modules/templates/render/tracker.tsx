"use client";

import { useEffect, useRef } from "react";

function ids() {
  const visitor = window.localStorage.getItem("adit_vid") ?? crypto.randomUUID();
  window.localStorage.setItem("adit_vid", visitor);
  const session = window.sessionStorage.getItem("adit_sid") ?? crypto.randomUUID();
  window.sessionStorage.setItem("adit_sid", session);
  return { visitor, session };
}

function deviceType() {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function trackPublicEvent(slug: string, eventName: string, metadata?: Record<string, string>) {
  const { visitor, session } = ids();
  const params = new URLSearchParams(window.location.search);
  void fetch("/api/public/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      eventName,
      anonymousVisitorId: visitor,
      anonymousSessionId: session,
      referrer: document.referrer || null,
      deviceType: deviceType(),
      utm: {
        utm_source: params.get("utm_source") ?? undefined,
        utm_medium: params.get("utm_medium") ?? undefined,
        utm_campaign: params.get("utm_campaign") ?? undefined,
        utm_content: params.get("utm_content") ?? undefined,
        utm_term: params.get("utm_term") ?? undefined,
      },
      metadata,
    }),
  });
}

export function PublicTracker({ slug }: { slug: string }) {
  useEffect(() => {
    trackPublicEvent(slug, "page_view");
    if (!window.sessionStorage.getItem("adit_sess_tracked")) {
      window.sessionStorage.setItem("adit_sess_tracked", "1");
      trackPublicEvent(slug, "session_start");
    }
  }, [slug]);
  return null;
}

export function TrackedLink({
  href,
  slug,
  eventName,
  className,
  metadata,
  children,
}: {
  href: string;
  slug: string;
  eventName: string;
  className?: string;
  metadata?: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => trackPublicEvent(slug, eventName, metadata)}
    >
      {children}
    </a>
  );
}

export function TrackedSection({
  slug,
  name,
  id,
  className,
  children,
}: {
  slug: string;
  name: string;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let sent = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !sent) {
          sent = true;
          trackPublicEvent(slug, "section_view", { section: name });
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [slug, name]);
  return (
    <section ref={ref} id={id} className={className}>
      {children}
    </section>
  );
}
