import { appConfig } from "@/lib/config";

export type DeployEnv = "local" | "preview" | "production";

/** APP_ENV를 local | preview | production 으로 정규화합니다. */
export function getDeployEnv(): DeployEnv {
  const raw = appConfig.env.toLowerCase();
  if (raw === "production" || raw === "prod") return "production";
  if (raw === "preview" || raw === "dev" || raw === "development" || raw === "staging") return "preview";
  return "local";
}

export function isProd() {
  return getDeployEnv() === "production";
}

export function isPreview() {
  return getDeployEnv() === "preview";
}

export function isLocal() {
  return getDeployEnv() === "local";
}

export function isNonProd() {
  return !isProd();
}
