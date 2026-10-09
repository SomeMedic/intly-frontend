import { Suspense } from "react";
import { AuthLayout, ResetPasswordForm } from "@/features/auth";

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Новый пароль" description="Одноразовая ссылка будет сразу использована.">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Проверяем ссылку сброса...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
