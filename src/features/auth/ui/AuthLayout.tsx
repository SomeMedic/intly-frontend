import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { BrandArt, BrandMark } from "@/components/intly/brand";
import { ThemeControls } from "@/components/intly/theme-controls";

export function AuthLayout({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-background px-5 py-5 sm:px-8">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-b pb-4">
        <BrandMark wordmark className="text-xl" />
        <ThemeControls />
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,27rem)] lg:gap-16">
        <aside className="hidden min-w-0 lg:block">
          <h1 className="max-w-lg text-[clamp(2rem,3.5vw,3.15rem)] font-semibold leading-[1.08]">
            Рабочее место для возможностей.
          </h1>
          <p className="mt-5 max-w-md text-[0.9375rem] leading-6 text-muted-foreground">
            INTLY собирает вакансии, проекты и тендеры в один поток, помогает быстро оценить
            релевантность и довести хороший вариант до отклика.
          </p>
          <div className="mt-7 grid max-w-md gap-2">
            {[
              "Единый поиск по всем источникам",
              "Профили под разные направления",
              "Сохранённые поиски и уведомления"
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-md border bg-card/70 px-3 py-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <BrandArt
            kind="gateway"
            priority
            className="intly-auth-art mt-6 w-full max-w-[28rem] opacity-90"
          />
        </aside>
        <section className="mx-auto w-full max-w-[27rem] rounded-lg border bg-card p-5 shadow-soft sm:p-6">
          <h2 className="text-2xl font-semibold leading-tight">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-7">{children}</div>
        </section>
      </div>
      <footer className="mx-auto w-full max-w-6xl border-t pt-4 text-xs text-muted-foreground">
        INTLY.tech · Рабочее пространство команды
      </footer>
    </main>
  );
}
