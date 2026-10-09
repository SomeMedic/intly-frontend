"use client";

import { AppShell } from "@/components/intly/app-shell";
import { DashboardScreen } from "@/features/dashboard";

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardScreen />
    </AppShell>
  );
}
