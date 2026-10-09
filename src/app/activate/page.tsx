import { Suspense } from "react";
import { ActivateInviteForm, AuthLayout } from "@/features/auth";

export default function ActivatePage() {
  return (
    <AuthLayout title="Активация приглашения" description="Создайте пароль и перейдите к минимальной настройке профиля.">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Проверяем ссылку приглашения...</div>}>
        <ActivateInviteForm />
      </Suspense>
    </AuthLayout>
  );
}
