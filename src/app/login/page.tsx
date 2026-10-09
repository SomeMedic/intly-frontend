import { AuthLayout, LoginForm } from "@/features/auth";

export default function LoginPage() {
  return (
    <AuthLayout title="Вход" description="Используйте учетную запись, созданную администратором.">
      <LoginForm />
    </AuthLayout>
  );
}
