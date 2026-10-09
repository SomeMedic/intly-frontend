import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "INTLY.tech",
  description: "Вакансии, проекты и тендеры в одном рабочем пространстве команды.",
  icons: { icon: "/brand/intly-mark.png", apple: "/brand/intly-mark.png" }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" data-theme="intly-plum" data-mode="light" data-effective-mode="light" data-density="compact" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
