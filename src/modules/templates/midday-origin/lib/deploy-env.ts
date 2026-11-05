/** 배포 환경 (CDK/Dockerfile의 NEXT_PUBLIC_DEPLOY_ENV) */
export function getDeployEnv(): "dev" | "prod" | "local" {
  const raw = String(process.env.NEXT_PUBLIC_DEPLOY_ENV || "").trim().toLowerCase();
  if (raw === "prod" || raw === "production") return "prod";
  if (raw === "dev" || raw === "development") return "dev";
  return "local";
}

/** 시드·위험한 개발용 액션 허용 (prod 제외) */
export function isNonProdDeploy(): boolean {
  return getDeployEnv() !== "prod";
}
