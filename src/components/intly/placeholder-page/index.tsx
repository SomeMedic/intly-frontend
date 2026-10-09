"use client";

import { AppShell } from "@/components/intly/app-shell";
import { EmptyState } from "@/components/intly/empty-state";

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <AppShell>
      <EmptyState
        title={title}
        description={
          description ?? "Здесь пока ничего нет. Вернитесь к обзору, чтобы продолжить работу."
        }
      />
    </AppShell>
  );
}
