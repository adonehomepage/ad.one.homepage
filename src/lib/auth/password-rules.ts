import { orgText } from "@/modules/admin/org-copy";

export function validatePasswordStrength(password: string) {
  if (password.length < 10) {
    return orgText("passwordMinLength");
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return orgText("passwordNeedMixed");
  }
  return null;
}
