"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth";

export function Modal({ open, onOpenChange, title, description, children, wide = false, placement = "center", onCloseAutoFocus }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string;
  description?: string; children: ReactNode; wide?: boolean; placement?: "center" | "drawer"; onCloseAutoFocus?: (event: Event) => void;
}) {
  const locale = useAuthStore((state) => state.user?.settings.locale);
  const returnFocus = useRef<HTMLElement | null>(null);
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm" />
      <Dialog.Content onFocusCapture={event => { if (event.target instanceof HTMLElement) event.target.scrollIntoView({ block: "nearest", inline: "nearest" }); }} onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }} onCloseAutoFocus={event => { onCloseAutoFocus?.(event); const opener = returnFocus.current; returnFocus.current = null; if (event.defaultPrevented) return; if (opener?.isConnected && !opener.matches(":disabled")) { event.preventDefault(); opener.focus(); } }} className={cn("fixed z-50 overflow-y-auto border bg-card p-4 shadow-xl focus:outline-none sm:p-5", placement === "drawer" ? "inset-y-0 right-0 h-dvh w-full sm:max-w-[min(72rem,92vw)] sm:rounded-l-xl" : "left-1/2 top-1/2 max-h-[90dvh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl", placement === "center" && (wide ? "max-w-5xl" : "max-w-xl"))}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div><Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
            <Dialog.Description className={cn("mt-1 text-sm text-muted-foreground", !description && "sr-only")}>{description ?? title}</Dialog.Description></div>
          <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label={locale === "en" ? "Close" : "Закрыть"}><X className="size-4" /></Button></Dialog.Close>
        </div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
