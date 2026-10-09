"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/intly/error-state";
import { setAccessToken } from "@/services/auth/token-store";
import { authApi } from "../api/auth-api";
import { useAuthStore } from "../model/auth-store";
import { activateSchema, type ActivateValues } from "../model/schemas";

export function ActivateInviteForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const setUser = useAuthStore((state) => state.setUser);
  const form = useForm<ActivateValues>({
    resolver: zodResolver(activateSchema),
    defaultValues: { token, name: "", password: "", confirmPassword: "" }
  });

  const validation = useQuery({
    queryKey: ["invite", token],
    queryFn: () => authApi.validateInvite(token),
    enabled: Boolean(token),
    retry: false
  });

  const mutation = useMutation({
    mutationFn: (values: ActivateValues) =>
      authApi.activateInvite({ token: values.token, name: values.name, password: values.password }),
    onSuccess: (session) => {
      setAccessToken(session.accessToken);
      setUser(session.user);
      router.replace("/onboarding");
    }
  });

  if (!token) {
    return <ErrorState title="Приглашение недоступно" message="В ссылке нет токена приглашения." />;
  }

  if (validation.isLoading) {
    return <div className="text-sm text-muted-foreground">Проверяем приглашение...</div>;
  }

  if (validation.isError || validation.data?.status !== "Invited") {
    return <ErrorState title="Приглашение недоступно" message="Ссылка истекла, уже использована или недействительна. Обратитесь к администратору." />;
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="rounded-md border bg-muted/45 p-3 text-sm text-muted-foreground">
        Активируем аккаунт для {validation.data?.email ?? "приглашенного пользователя"}.
      </div>
      {mutation.error ? <ErrorState message="Не удалось активировать приглашение. Проверьте срок действия ссылки." /> : null}
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Имя</span>
        <Input autoComplete="name" {...form.register("name")} />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Пароль</span>
        <Input type="password" autoComplete="new-password" {...form.register("password")} />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Повторите пароль</span>
        <Input type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
      </label>
      <Button className="w-full" type="submit" loading={mutation.isPending || validation.isLoading}>
        Активировать
      </Button>
    </form>
  );
}
