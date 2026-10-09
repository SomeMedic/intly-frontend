import Image from "next/image";
import { cn } from "@/lib/utils";

export type BrandArtKind = "gateway" | "knowledge" | "analysis" | "workflow" | "resume" | "connections" | "empty";

const artwork: Record<BrandArtKind, string> = {
  gateway: "/brand/opportunity-gateway.png",
  knowledge: "/brand/knowledge-library.png",
  analysis: "/brand/analysis-lens.png",
  workflow: "/brand/workflow-path.png",
  resume: "/brand/resume-tailoring.png",
  connections: "/brand/source-connections.png",
  empty: "/brand/empty-signal.png"
};

/** The same silhouette takes its ink from the current theme. */
export function BrandMark({ className, wordmark = false }: { className?: string; wordmark?: boolean }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2.5", className)} aria-label="INTLY.tech">
      <span className="intly-brand-mark block size-9 shrink-0 bg-primary" aria-hidden="true" />
      {wordmark ? <span className="font-semibold tracking-[-0.025em]">INTLY<span className="font-normal text-muted-foreground">.tech</span></span> : null}
    </span>
  );
}

/** Decorative images have no repeated alt text; the surrounding copy carries their meaning. */
export function BrandArt({ kind, className, priority = false }: { kind: BrandArtKind; className?: string; priority?: boolean }) {
  return (
    <div className={cn("relative aspect-[3/2]", className)} aria-hidden="true">
      <Image src={artwork[kind]} alt="" fill priority={priority} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 280px, 480px" className="object-contain" />
    </div>
  );
}
