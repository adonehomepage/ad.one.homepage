import { appConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

/** RFC 9116 security.txt */
export async function GET() {
  const contact = appConfig.privacyContactEmail || appConfig.emailFrom || "";
  const policy = appConfig.privacyPolicyUrl || `${appConfig.publicUrl.replace(/\/$/, "")}/privacy`;
  const expires = new Date();
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  const lines = [
    contact ? `Contact: mailto:${contact}` : null,
    `Expires: ${expires.toISOString()}`,
    `Preferred-Languages: ko, en`,
    `Canonical: ${appConfig.publicUrl.replace(/\/$/, "")}/.well-known/security.txt`,
    `Policy: ${policy}`,
    "",
  ].filter((line): line is string => line !== null);

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
