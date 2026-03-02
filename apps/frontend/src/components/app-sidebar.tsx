"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  MessageSquare,
  Phone,
  Zap,
  Plug,
  CalendarDays,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/contacts", label: "Contatos", icon: Users, exact: false },
  { href: "/app/opportunities", label: "Oportunidades", icon: Kanban, exact: false },
  { href: "/app/calendar", label: "Calendário", icon: CalendarDays, exact: false },
  { href: "/app/inbox", label: "Inbox", icon: MessageSquare, exact: false },
  { href: "/app/telephony", label: "Telefonia", icon: Phone, exact: false },
  { href: "/app/automation", label: "Automação", icon: Zap, exact: false },
  { href: "/app/integrations", label: "Integrações", icon: Plug, exact: false },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-white/[0.06] bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
        <div className="flex size-8 items-center justify-center rounded-xl gradient-primary glow-primary-sm flex-shrink-0">
          <Sparkles className="size-4 text-white" />
        </div>
        <div className="min-w-0">
          <span className="block text-sm font-bold tracking-tight gradient-text">Aureon</span>
          <span className="block text-[10px] text-muted-foreground/50 -mt-0.5">CRM & Automação</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-widest">
          Menu
        </p>
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "gradient-primary text-white shadow-md glow-primary-sm"
                  : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isActive
                    ? "text-white"
                    : "text-muted-foreground/60 group-hover:text-foreground"
                )}
              />
              <span>{label}</span>
              {isActive && (
                <span className="ml-auto size-1.5 rounded-full bg-white/60 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.06] p-2 space-y-0.5">
        {/* User info */}
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-1">
          <div className="flex size-7 items-center justify-center rounded-full gradient-primary flex-shrink-0">
            <span className="text-white text-[10px] font-bold">A</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">Admin</p>
            <p className="text-[10px] text-muted-foreground/50 truncate">aureon.app</p>
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-white/[0.05] hover:text-red-400"
        >
          <LogOut className="size-4 shrink-0" />
          Sair
        </Link>
      </div>
    </aside>
  );
}
