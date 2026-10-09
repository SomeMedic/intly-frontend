import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль")
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Введите корректный email")
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Минимум 8 символов"),
    confirmPassword: z.string().min(8, "Повторите пароль")
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Пароли должны совпадать"
  });

export const activateSchema = resetPasswordSchema.extend({
  name: z.string().trim().min(2, "Введите имя")
});

export type LoginValues = z.infer<typeof loginSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ActivateValues = z.infer<typeof activateSchema>;
