"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, tenant, logout } = useAuth();

  const displayName = user?.name?.trim() || user?.email || "Usuário";
  const displaySubtitle = user?.isPlatformUser
    ? user.role === "platform_admin"
      ? "Administrador da plataforma"
      : user.role === "platform_support"
        ? "Suporte Aureon"
        : "Equipe Aureon"
    : tenant?.name ?? tenant?.slug ?? user?.email ?? "";
  const avatarLetter = (displayName || "?").charAt(0).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Menu do usuário"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
          <span className="text-sm font-bold">{avatarLetter}</span>
        </div>
        <span className="hidden max-w-[100px] truncate text-sm font-medium sm:inline">
          {displayName}
        </span>
        <ChevronDown
          className={cn("hidden size-4 shrink-0 transition-transform sm:block", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-border bg-popover py-1 shadow-lg animate-in fade-in zoom-in-95 duration-150"
          role="menu"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground" title={user?.email ?? ""}>
              {displaySubtitle}
            </p>
          </div>
          <Link
            href="/app"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            role="menuitem"
          >
            <User className="size-4 shrink-0" />
            Perfil
          </Link>
          <Link
            href="/app"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            role="menuitem"
          >
            <Settings className="size-4 shrink-0" />
            Configurações
          </Link>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            onClick={async () => {
              setOpen(false);
              await logout();
              router.push("/login");
            }}
          >
            <LogOut className="size-4 shrink-0" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
