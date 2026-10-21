import type { MetadataRoute } from "next";
import { appConfig } from "@/lib/config";
import { getDeployEnv } from "@/lib/deploy-env";

export default function robots(): MetadataRoute.Robots {
  const base = appConfig.publicUrl.replace(/\/$/, "");
  if (getDeployEnv() !== "production") {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/login", "/invite/", "/api/", "/media/", "/verify-recipient", "/reset-password"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
