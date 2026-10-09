import { Suspense } from "react";
import { AuthLayout, ResetPasswordForm } from "@/features/auth";

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Новый пароль"
      description="Придумайте новый пароль. После сохранения можно будет войти обычным способом."
    >
      <Suspense
        fallback={<div className="text-sm text-muted-foreground">Проверяем ссылку сброса...</div>}
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
