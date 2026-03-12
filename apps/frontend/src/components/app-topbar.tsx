"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { NotificationBell } from "@/components/notification-bell";
const pathLabels: Record<string, string> = {
  app: "Dashboard",
  contacts: "Contatos",
  opportunities: "Oportunidades",
  calendar: "Calendário",
  inbox: "Inbox",
  telephony: "Telefonia",
  "email-marketing": "Email Marketing",
  reputation: "Reputação",
  proposals: "Propostas",
  automation: "Automação",
  integrations: "Integrações",
  channels: "Canais",
  templates: "Templates",
  new: "Novo",
  "power-dialer": "Discador",
  "call-history": "Histórico",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getBreadcrumbs(pathname: string) {
  const segments = pathname.replace(/^\/app\/?/, "").split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Dashboard", href: "/app" }];

  const crumbs: { label: string; href: string }[] = [
    { label: "Dashboard", href: "/app" },
  ];

  let href = "/app";
  for (const segment of segments) {
    href += `/${segment}`;
    let label: string;
    if (pathLabels[segment]) {
      label = pathLabels[segment];
    } else if (UUID_REGEX.test(segment)) {
      label = "Detalhe";
    } else {
      label = segment.charAt(0).toUpperCase() + segment.slice(1);
    }
    crumbs.push({ label, href });
  }

  return crumbs;
}

interface AppTopBarProps {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
}

export function AppTopBar({ onMenuClick, onSearchClick }: AppTopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const breadcrumbs = getBreadcrumbs(pathname);
  const canGoBack = breadcrumbs.length > 1;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden -ml-1"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </Button>
        {canGoBack && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => router.back()}
            aria-label="Voltar"
          >
            <ArrowLeft className="size-5" />
          </Button>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-4">
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-2 text-muted-foreground">
              {i > 0 && <span className="text-muted-foreground/40">/</span>}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-foreground">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:text-foreground transition-colors truncate max-w-[100px] sm:max-w-[140px]"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          {onSearchClick && (
            <button
              type="button"
              onClick={onSearchClick}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Buscar (Ctrl+K)"
            >
              <Search className="size-4 shrink-0" />
              <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] sm:inline-block">
                Ctrl+K
              </kbd>
            </button>
          )}
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
