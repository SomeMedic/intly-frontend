"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/intly/error-state";
import { ApiError } from "@/services/api";
import { loginSchema, type LoginValues } from "../model/schemas";
import { useAuth } from "../model/auth-provider";

export function LoginForm() {
  const [showPassword, setShowPassword] = React.useState(false);
  const { loginMutation } = useAuth();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const error = loginMutation.error;

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}>
      {error ? (
        <ErrorState
          title="Вход не выполнен"
          message={error instanceof ApiError ? error.message : "Проверьте данные и повторите попытку."}
        />
      ) : null}
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Email</span>
        <Input autoComplete="username" type="email" {...form.register("email")} />
        {form.formState.errors.email ? (
          <span className="text-xs text-destructive">{form.formState.errors.email.message}</span>
        ) : null}
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Пароль</span>
        <div className="flex gap-2">
          <Input
            autoComplete="current-password"
            type={showPassword ? "text" : "password"}
            {...form.register("password")}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
        {form.formState.errors.password ? (
          <span className="text-xs text-destructive">{form.formState.errors.password.message}</span>
        ) : null}
      </label>
      <Button type="submit" className="w-full" loading={loginMutation.isPending}>
        Войти
      </Button>
      <div className="text-center text-sm">
        <Link href="/forgot-password" className="text-primary hover:underline">
          Забыли пароль?
        </Link>
      </div>
    </form>
  );
}
