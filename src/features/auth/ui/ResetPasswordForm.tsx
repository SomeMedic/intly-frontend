"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/intly/error-state";
import { authApi } from "../api/auth-api";
import { resetPasswordSchema, type ResetPasswordValues } from "../model/schemas";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" }
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordValues) =>
      authApi.resetPassword({ token: values.token, newPassword: values.password }),
    onSuccess: () => router.replace("/login?reset=success")
  });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      {!token ? <ErrorState title="Ссылка недействительна" message="Запросите новую ссылку для сброса пароля." /> : null}
      {mutation.error ? <ErrorState message="Не удалось сменить пароль. Проверьте срок действия ссылки." /> : null}
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Новый пароль</span>
        <Input type="password" autoComplete="new-password" {...form.register("password")} />
        {form.formState.errors.password ? (
          <span className="text-xs text-destructive">{form.formState.errors.password.message}</span>
        ) : null}
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Повторите пароль</span>
        <Input type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
        {form.formState.errors.confirmPassword ? (
          <span className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</span>
        ) : null}
      </label>
      <Button className="w-full" type="submit" disabled={!token} loading={mutation.isPending}>
        Сменить пароль
      </Button>
    </form>
  );
}
