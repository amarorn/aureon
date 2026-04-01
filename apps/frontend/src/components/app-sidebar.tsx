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
  Mail,
  Star,
  FileCheck,
  BarChart3,
  Megaphone,
  Building2,
  LogOut,
  Sparkles,
  PanelLeftClose,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const navGroups = [
  {
    label: "Principal",
    items: [
      { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/app/contacts", label: "Contatos", icon: Users, exact: false },
      { href: "/app/opportunities", label: "Oportunidades", icon: Kanban, exact: false },
    ],
  },
  {
    label: "Comunicação",
    items: [
      {
        href: "/app/inbox",
        label: "Inbox",
        icon: MessageSquare,
        exact: false,
        children: [
          { href: "/app/inbox/channels", label: "Canais" },
          { href: "/app/inbox/templates", label: "Templates" },
        ],
      },
      { href: "/app/telephony", label: "Telefonia", icon: Phone, exact: false },
      { href: "/app/calendar", label: "Calendário", icon: CalendarDays, exact: false },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/app/email-marketing", label: "Email Marketing", icon: Mail, exact: false },
      { href: "/app/reputation", label: "Reputação", icon: Star, exact: false },
      { href: "/app/proposals", label: "Propostas", icon: FileCheck, exact: false },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/app/automation", label: "Automação", icon: Zap, exact: false },
      { href: "/app/integrations", label: "Integrações", icon: Plug, exact: false },
      { href: "/app/analytics/google", label: "Google Analytics", icon: BarChart3, exact: false },
      { href: "/app/ads/google", label: "Google Ads", icon: Megaphone, exact: false },
      { href: "/app/ads/tiktok", label: "TikTok Ads", icon: TrendingUp, exact: false },
      { href: "/app/business/google", label: "Business Profile", icon: Building2, exact: false },
    ],
  },
];

interface AppSidebarProps {
  collapsed?: boolean;
  onCollapse?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({
  collapsed = false,
  onCollapse,
  mobileOpen = false,
  onMobileClose,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const adminNav =
    user?.isPlatformUser === true
      ? [
          {
            label: "Aureon",
            items: [
              {
                href: "/app/admin/access-requests",
                label: "Cadastros",
                icon: ShieldCheck,
                exact: false,
              },
            ],
          },
        ]
      : [];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out lg:relative lg:z-auto",
          collapsed ? "w-16" : "w-56",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <Link
          href="/app"
          onClick={onMobileClose}
          className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3 hover:bg-sidebar-accent/50 transition-colors"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl gradient-primary glow-primary-sm">
            <Sparkles className="size-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="block truncate text-sm font-bold tracking-tight gradient-text">
                Aureon
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">
                CRM & Automação
              </span>
            </div>
          )}
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
          {[...navGroups, ...adminNav].map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const hasChildren =
                    "children" in item &&
                    Array.isArray(
                      (item as { children?: { href: string; label: string }[] }).children,
                    ) &&
                    (
                      (item as { children: { href: string; label: string }[] }).children
                        ?.length ?? 0
                    ) > 0;
                  const { href, label, icon: Icon, exact } = item;
                  const isActive = exact
                    ? pathname === href
                    : pathname === href || pathname.startsWith(href + "/");
                  const isExpanded = hasChildren && (pathname === href || pathname.startsWith(href + "/"));

                  if (hasChildren && !collapsed) {
                    return (
                      <div key={href}>
                        <Link
                          href={href}
                          onClick={onMobileClose}
                          className={cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-primary/15 text-primary shadow-sm"
                              : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-4 shrink-0",
                              isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          <span className="flex-1 truncate">{label}</span>
                          <ChevronDown
                            className={cn(
                              "size-4 shrink-0 transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </Link>
                        {isExpanded && hasChildren && (
                          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-4">
                            {(
                              item as {
                                children: { href: string; label: string }[];
                              }
                            ).children.map((child) => {
                              const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={onMobileClose}
                                  className={cn(
                                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                                    childActive
                                      ? "text-primary"
                                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                  )}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onMobileClose}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                        collapsed && "justify-center px-0",
                        isActive
                          ? "bg-primary/15 text-primary shadow-sm"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      title={collapsed ? label : undefined}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{label}</span>
                          {isActive && (
                            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={cn("shrink-0 border-t border-border p-2 space-y-1", collapsed && "flex flex-col items-center gap-1")}>
          {!collapsed && (
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                <span className="text-xs font-bold">A</span>
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-xs font-medium text-foreground">Admin</p>
                <p className="truncate text-[10px] text-muted-foreground">aureon.app</p>
              </div>
            </div>
          )}
          <div className={cn("flex items-center gap-1", !collapsed && "justify-between")}>
            <ThemeToggle />
            {onCollapse && (
              <button
                onClick={onCollapse}
                className="hidden size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground lg:flex"
                aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              >
                <PanelLeftClose
                  className={cn("size-4 transition-transform duration-200", collapsed && "rotate-180")}
                />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? "Sair" : undefined}
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
