"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const searchItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, keywords: "inicio" },
  { href: "/app/contacts", label: "Contatos", icon: Users, keywords: "pessoas" },
  { href: "/app/opportunities", label: "Oportunidades", icon: Kanban, keywords: "vendas pipeline" },
  { href: "/app/inbox", label: "Inbox", icon: MessageSquare, keywords: "mensagens conversas" },
  { href: "/app/inbox/channels", label: "Canais", icon: MessageSquare, keywords: "inbox" },
  { href: "/app/inbox/templates", label: "Templates", icon: MessageSquare, keywords: "inbox" },
  { href: "/app/telephony", label: "Telefonia", icon: Phone, keywords: "chamadas discador" },
  { href: "/app/calendar", label: "Calendário", icon: CalendarDays, keywords: "agenda eventos" },
  { href: "/app/email-marketing", label: "Email Marketing", icon: Mail, keywords: "campanhas" },
  { href: "/app/reputation", label: "Reputação", icon: Star, keywords: "avaliacoes" },
  { href: "/app/proposals", label: "Propostas", icon: FileCheck, keywords: "propostas" },
  { href: "/app/automation", label: "Automação", icon: Zap, keywords: "workflows" },
  { href: "/app/integrations", label: "Integrações", icon: Plug, keywords: "conexoes" },
];

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = query.trim()
    ? searchItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.keywords.toLowerCase().includes(query.toLowerCase())
      )
    : searchItems;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(1, filtered.length));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % Math.max(1, filtered.length));
        return;
      }
      if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        router.push(filtered[selectedIndex].href);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, filtered, selectedIndex, router]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-popover shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar... (Ctrl+K)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="h-12 w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoComplete="off"
          />
          <kbd className="hidden rounded border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
            Esc
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado
            </p>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.href}
                type="button"
                data-index={index}
                onClick={() => handleSelect(item.href)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground focus:outline-none",
                  index === selectedIndex && "bg-accent text-accent-foreground"
                )}
              >
                <item.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
