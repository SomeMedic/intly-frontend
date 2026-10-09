import type { ReactNode } from "react";
import { BrandArt, BrandMark } from "@/components/intly/brand";
import { ThemeControls } from "@/components/intly/theme-controls";

export function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col px-5 py-5 sm:px-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <BrandMark wordmark className="text-xl" />
        <ThemeControls />
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 py-10 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        <aside className="hidden min-w-0 lg:block">
          <h1 className="max-w-lg text-[clamp(2rem,3.5vw,3.25rem)] font-semibold leading-[1.12] tracking-[-0.03em]">Следующая возможность — в фокусе.</h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">Вакансии, проекты и тендеры в одном рабочем пространстве. От первого сигнала до продуманного отклика.</p>
          <BrandArt kind="gateway" priority className="intly-auth-art mt-5 w-full max-w-[32rem]" />
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">Общий поток возможностей. Личный контекст для каждого направления.</p>
        </aside>
        <section className="mx-auto w-full max-w-[26rem] rounded-2xl bg-card p-6 shadow-soft sm:p-8">
          <h2 className="text-2xl font-semibold tracking-[-0.025em]">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-7">{children}</div>
        </section>
      </div>
      <footer className="mx-auto w-full max-w-6xl text-xs text-muted-foreground">INTLY · Рабочее пространство команды</footer>
    </main>
  );
}
