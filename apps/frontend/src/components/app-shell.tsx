"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { CommandPalette } from "@/components/command-palette";
import { TourFloatingButton } from "@/components/tour-floating-button";

const SIDEBAR_COLLAPSED_KEY = "aureon-sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setSearchOpen(false);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((p) => !p);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setSidebarCollapsed((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {searchOpen ? <CommandPalette onClose={() => setSearchOpen(false)} /> : null}
      <AppSidebar
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed((p) => !p)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppTopBar
          onMenuClick={() => setMobileMenuOpen((p) => !p)}
          onSearchClick={() => setSearchOpen(true)}
        />
        <main className="flex-1 overflow-y-auto relative">
          <TourFloatingButton />
          <div
            key={pathname}
            className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 animate-in fade-in duration-300"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
