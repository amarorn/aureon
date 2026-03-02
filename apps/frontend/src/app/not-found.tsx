import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <h1 className="text-6xl font-bold text-foreground">404</h1>
      <p className="text-muted-foreground">Página não encontrada</p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/" className="gap-2">
            <Home className="size-4" />
            Início
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/app" className="gap-2">
            <ArrowLeft className="size-4" />
            Plataforma
          </Link>
        </Button>
      </div>
    </div>
  );
}
