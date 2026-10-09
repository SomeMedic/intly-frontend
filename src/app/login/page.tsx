import { AuthLayout, LoginForm } from "@/features/auth";

export default function LoginPage() {
  return (
    <AuthLayout
      title="Вход в INTLY"
      description="Войдите в рабочее пространство, чтобы продолжить разбор возможностей."
    >
      <LoginForm />
    </AuthLayout>
  );
}
