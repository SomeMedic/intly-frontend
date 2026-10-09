import { AuthLayout, ForgotPasswordForm } from "@/features/auth";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Восстановление доступа"
      description="Укажите email. Если он есть в INTLY, мы отправим ссылку для смены пароля."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
