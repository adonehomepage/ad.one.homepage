import { hash, compare } from "bcryptjs";

export { validatePasswordStrength } from "@/lib/auth/password-rules";

const ROUNDS = 12;

export function hashPassword(password: string) {
  return hash(password, ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}
