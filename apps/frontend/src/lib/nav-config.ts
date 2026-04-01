import type { LucideIcon } from "lucide-react";
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
  TrendingUp,
} from "lucide-react";

export type NavChild = { href: string; label: string; feature?: string };

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  feature?: string;
  children?: NavChild[];
};

export const mainNavGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Principal",
    items: [
      { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/app/contacts", label: "Contatos", icon: Users, exact: false, feature: "crm.contacts" },
      {
        href: "/app/opportunities",
        label: "Oportunidades",
        icon: Kanban,
        exact: false,
        feature: "crm.opportunities",
      },
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
        feature: "inbox.core",
        children: [
          { href: "/app/inbox/channels", label: "Canais", feature: "inbox.core" },
          { href: "/app/inbox/templates", label: "Templates", feature: "inbox.core" },
        ],
      },
      {
        href: "/app/telephony",
        label: "Telefonia",
        icon: Phone,
        exact: false,
        feature: "telephony.core",
      },
      {
        href: "/app/calendar",
        label: "Calendário",
        icon: CalendarDays,
        exact: false,
        feature: "calendar.core",
      },
    ],
  },
  {
    label: "Marketing",
    items: [
      {
        href: "/app/email-marketing",
        label: "Email Marketing",
        icon: Mail,
        exact: false,
        feature: "email.marketing",
      },
      {
        href: "/app/reputation",
        label: "Reputação",
        icon: Star,
        exact: false,
        feature: "reputation.core",
      },
      {
        href: "/app/proposals",
        label: "Propostas",
        icon: FileCheck,
        exact: false,
        feature: "proposals.core",
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        href: "/app/automation",
        label: "Automação",
        icon: Zap,
        exact: false,
        feature: "automation.core",
      },
      {
        href: "/app/integrations",
        label: "Integrações",
        icon: Plug,
        exact: false,
        feature: "integrations.core",
      },
      {
        href: "/app/analytics/google",
        label: "Google Analytics",
        icon: BarChart3,
        exact: false,
        feature: "analytics.google",
      },
      {
        href: "/app/ads/google",
        label: "Google Ads",
        icon: Megaphone,
        exact: false,
        feature: "ads.google",
      },
      {
        href: "/app/ads/tiktok",
        label: "TikTok Ads",
        icon: TrendingUp,
        exact: false,
        feature: "ads.tiktok",
      },
      {
        href: "/app/business/google",
        label: "Business Profile",
        icon: Building2,
        exact: false,
        feature: "business.google",
      },
    ],
  },
];

export function filterNavByFeatures(
  groups: { label: string; items: NavItem[] }[],
  hasFeature: (code: string) => boolean,
): { label: string; items: NavItem[] }[] {
  return groups
    .map((group) => {
      const items = group.items
        .map((item) => {
          if (item.children?.length) {
            const parentOk = !item.feature || hasFeature(item.feature);
            if (!parentOk) return null;
            const children = item.children.filter(
              (c) => !c.feature || hasFeature(c.feature),
            );
            if (children.length === 0) return null;
            return { ...item, children };
          }
          if (!item.feature || hasFeature(item.feature)) return item;
          return null;
        })
        .filter(Boolean) as NavItem[];
      return { ...group, items };
    })
    .filter((g) => g.items.length > 0);
}
