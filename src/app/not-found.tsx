import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md rounded-lg border bg-card p-6 text-center shadow-soft">
        <h1 className="text-xl font-semibold">Страница не найдена</h1>
        <p className="mt-2 text-sm text-muted-foreground">Маршрут еще не реализован или ссылка устарела.</p>
        <Button asChild className="mt-5">
          <Link href="/dashboard">Открыть Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
