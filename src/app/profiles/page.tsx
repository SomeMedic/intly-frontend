import { Suspense } from "react";
import { AppShell } from "@/components/intly/app-shell";
import { ProfilesScreen } from "@/features/profiles";

export default function ProfilesPage() {
  return <Suspense fallback={<AppShell><p>Загружаем профили…</p></AppShell>}><ProfilesScreen /></Suspense>;
}
