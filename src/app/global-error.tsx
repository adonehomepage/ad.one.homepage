"use client";

import { orgText } from "@/modules/admin/org-copy";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "Pretendard, sans-serif", background: "#f2f4f6", color: "#191f28" }}>
        <main
          role="alert"
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500, color: "#3182f6" }}>ADONEBRIDGE</p>
            <h1 style={{ margin: "0.5rem 0 0", fontSize: "1.875rem", fontWeight: 700 }}>{orgText("errorTitle")}</h1>
            <p style={{ margin: "0.75rem 0 0", color: "#4e5968" }}>{orgText("errorBody")}</p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                marginTop: "2rem",
                height: 48,
                border: 0,
                borderRadius: 14,
                padding: "0 1.25rem",
                background: "#3182f6",
                color: "#fff",
                fontSize: 17,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {orgText("errorRetry")}
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
