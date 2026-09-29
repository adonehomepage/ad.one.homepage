import { brandLabel } from "@/lib/config";
import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return <LoginForm brandName={brandLabel()} />;
}
