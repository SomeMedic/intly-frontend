import { AuthLayout, ForgotPasswordForm } from "@/features/auth";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Сброс пароля" description="Мы покажем нейтральный результат, даже если email не найден.">
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
