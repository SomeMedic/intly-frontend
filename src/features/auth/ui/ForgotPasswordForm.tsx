"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/intly/error-state";
import { authApi } from "../api/auth-api";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../model/schemas";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" }
  });

  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordValues) => authApi.forgotPassword(values.email),
    onSuccess: () => setSent(true)
  });

  if (sent) {
    return (
      <div className="rounded-md border bg-muted/45 p-4 text-sm text-muted-foreground">
        Если аккаунт существует и доступен, ссылка для сброса будет отправлена на указанную почту.
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      {mutation.error ? <ErrorState message="Не удалось отправить запрос. Попробуйте еще раз." /> : null}
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Email</span>
        <Input type="email" autoComplete="username" {...form.register("email")} />
        {form.formState.errors.email ? (
          <span className="text-xs text-destructive">{form.formState.errors.email.message}</span>
        ) : null}
      </label>
      <Button className="w-full" type="submit" loading={mutation.isPending}>
        Отправить ссылку
      </Button>
    </form>
  );
}
