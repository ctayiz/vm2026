import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  const inviteRequired = !!process.env.INVITE_CODE?.trim();
  return <AuthForm mode="register" inviteRequired={inviteRequired} />;
}
