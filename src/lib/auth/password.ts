import { hash, compare } from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(password: string) {
  return hash(password, ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export function validatePasswordStrength(password: string) {
  if (password.length < 10) {
    return "비밀번호는 10자 이상이어야 합니다.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "비밀번호는 영문과 숫자를 포함해야 합니다.";
  }
  return null;
}
