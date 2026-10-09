import { Suspense } from "react";
import { ActivateInviteForm, AuthLayout } from "@/features/auth";

export default function ActivatePage() {
  return (
    <AuthLayout
      title="Добро пожаловать в INTLY"
      description="Создайте пароль, затем настройте первый профиль для поиска возможностей."
    >
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">Проверяем ссылку приглашения...</div>
        }
      >
        <ActivateInviteForm />
      </Suspense>
    </AuthLayout>
  );
}
