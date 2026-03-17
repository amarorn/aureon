// Official brand logos for the integrations page
// Uses react-icons/si (Simple Icons) where available; inline SVG or styled initials as fallback
import {
  SiGmail,
  SiGooglecalendar,
  SiGoogleanalytics,
  SiGoogle,
  SiFacebook,
  SiGoogleads,
  SiZoom,
  SiTiktok,
  SiWhatsapp,
  SiSlack,
  SiMercadopago,
  SiStripe,
  SiTwilio,
  SiSendgrid,
  SiInstagram,
  SiCalendly,
  SiTelegram,
} from "react-icons/si";

// ── Inline SVGs for brands not in simple-icons ──────────────────────────────

function LinkedInSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
        fill="#0A66C2"
      />
    </svg>
  );
}

function OutlookSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="1" y="6" width="10" height="12" rx="1.5" fill="#0078D4" />
      <rect x="11.5" y="3" width="11.5" height="6.5" rx="1" fill="#28A8E8" />
      <rect x="11.5" y="10" width="5.5" height="6.5" rx="1" fill="#0F78D4" />
      <rect x="17.5" y="10" width="5.5" height="6.5" rx="1" fill="#0364B8" />
      <rect x="11.5" y="17" width="11.5" height="4" rx="1" fill="#1490DF" />
      <text x="6" y="15.5" fontSize="7" fontWeight="700" fill="white" textAnchor="middle">Oo</text>
    </svg>
  );
}

function AwsSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.064.056.128.056.184 0 .08-.048.16-.152.24l-.503.335a.383.383 0 01-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 01-.287-.375 6.18 6.18 0 01-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.486-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.03-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.862.272a2.287 2.287 0 01-.28.104.488.488 0 01-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 01.224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 011.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 00-.735-.136 6.02 6.02 0 00-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.063-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 01-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 01.32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 01.311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 01-.056.2l-1.923 6.17c-.048.16-.104.263-.168.311-.063.048-.168.08-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08h-.686zm10.29.217a5.1 5.1 0 01-1.2-.144c-.391-.096-.694-.2-.902-.32-.128-.071-.215-.151-.247-.223a.563.563 0 01-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 00.41-.758.777.777 0 00-.215-.559c-.144-.151-.416-.287-.807-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.813a1.902 1.902 0 01-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.415.32-.096.655-.136 1.006-.136.175 0 .359.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 01.24.2.43.43 0 01.071.263v.375c0 .168-.064.256-.184.256a.83.83 0 01-.303-.096 3.652 3.652 0 00-1.532-.311c-.455 0-.815.071-1.062.223-.248.152-.375.383-.375.71 0 .224.08.416.24.567.159.152.454.304.877.44l1.134.358c.574.184.99.44 1.237.774.247.333.367.718.367 1.149 0 .343-.072.655-.207.926-.144.272-.336.511-.583.703-.248.2-.543.343-.886.447-.36.111-.743.167-1.166.167zM21.4 16.204c-2.645 1.956-6.479 2.995-9.782 2.995-4.63 0-8.796-1.71-11.95-4.558-.247-.224-.024-.527.272-.351 3.404 1.979 7.608 3.17 11.95 3.17 2.93 0 6.15-.606 9.118-1.86.447-.192.821.295.392.604z"
        fill="#FF9900"
      />
    </svg>
  );
}

function TeamsInitials({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="8" width="13" height="14" rx="2" fill="#6264A7" />
      <rect x="9" y="2" width="13" height="14" rx="2" fill="#4F52B2" opacity="0.9" />
      <text x="15.5" y="12.5" fontSize="7" fontWeight="700" fill="white" textAnchor="middle">T</text>
    </svg>
  );
}

// ── Brand map ───────────────────────────────────────────────────────────────

type BrandEntry =
  | { type: "si"; icon: React.ElementType; bg: string; color: string }
  | { type: "svg"; component: React.ElementType; bg: string }
  | { type: "initials"; text: string; bg: string; color: string };

const BRAND_MAP: Record<string, BrandEntry> = {
  gmail: { type: "si", icon: SiGmail, bg: "rgba(234,67,53,0.12)", color: "#EA4335" },
  outlook: { type: "svg", component: OutlookSvg, bg: "rgba(0,120,212,0.10)" },
  google_calendar: { type: "si", icon: SiGooglecalendar, bg: "rgba(66,133,244,0.12)", color: "#4285F4" },
  google_analytics: { type: "si", icon: SiGoogleanalytics, bg: "rgba(232,113,10,0.12)", color: "#E8710A" },
  google_business_profile: { type: "si", icon: SiGoogle, bg: "rgba(66,133,244,0.12)", color: "#4285F4" },
  facebook_ads: { type: "si", icon: SiFacebook, bg: "rgba(24,119,242,0.12)", color: "#1877F2" },
  google_ads: { type: "si", icon: SiGoogleads, bg: "rgba(66,133,244,0.12)", color: "#4285F4" },
  zoom: { type: "si", icon: SiZoom, bg: "rgba(45,140,255,0.12)", color: "#2D8CFF" },
  linkedin: { type: "svg", component: LinkedInSvg, bg: "rgba(10,102,194,0.12)" },
  tiktok_ads: { type: "si", icon: SiTiktok, bg: "rgba(255,255,255,0.06)", color: "#ffffff" },
  whatsapp: { type: "si", icon: SiWhatsapp, bg: "rgba(37,211,102,0.12)", color: "#25D366" },
  slack: { type: "si", icon: SiSlack, bg: "rgba(74,21,75,0.20)", color: "#E01E5A" },
  "microsoft-teams": { type: "svg", component: TeamsInitials, bg: "rgba(98,100,167,0.12)" },
  mercadopago: { type: "si", icon: SiMercadopago, bg: "rgba(0,158,227,0.12)", color: "#009EE3" },
  stripe: { type: "si", icon: SiStripe, bg: "rgba(99,91,255,0.12)", color: "#635BFF" },
  twilio: { type: "si", icon: SiTwilio, bg: "rgba(242,47,70,0.12)", color: "#F22F46" },
  sendgrid: { type: "si", icon: SiSendgrid, bg: "rgba(26,130,226,0.12)", color: "#1A82E2" },
  "amazon-ses": { type: "svg", component: AwsSvg, bg: "rgba(255,153,0,0.10)" },
  docusign: { type: "initials", text: "DS", bg: "rgba(0,102,204,0.12)", color: "#0066CC" },
  instagram: { type: "si", icon: SiInstagram, bg: "rgba(225,48,108,0.12)", color: "#E1306C" },
  telegram: { type: "si", icon: SiTelegram, bg: "rgba(0,136,204,0.12)", color: "#0088CC" },
  calendly: { type: "si", icon: SiCalendly, bg: "rgba(0,107,255,0.12)", color: "#006BFF" },
  // Initials fallbacks for niche/Brazilian brands
  asaas: { type: "initials", text: "AS", bg: "rgba(124,58,237,0.15)", color: "#a78bfa" },
  clicksign: { type: "initials", text: "CS", bg: "rgba(0,200,83,0.12)", color: "#00C853" },
  calcom: { type: "initials", text: "Cal", bg: "rgba(255,255,255,0.06)", color: "#e2e8f0" },
  rd_station: { type: "initials", text: "RD", bg: "rgba(0,201,0,0.12)", color: "#00C900" },
  linkedin_leadgen: { type: "svg", component: LinkedInSvg, bg: "rgba(10,102,194,0.12)" },
  meet_zoom_ux: { type: "si", icon: SiZoom, bg: "rgba(45,140,255,0.12)", color: "#2D8CFF" },
};

export function BrandLogo({ id, size = 40 }: { id: string; size?: number }) {
  const radius = Math.round(size * 0.3);
  const brand = BRAND_MAP[id];

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    borderRadius: radius,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (!brand) {
    return (
      <div
        style={{
          ...containerStyle,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: size * 0.26,
          fontWeight: 700,
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {id.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  if (brand.type === "si") {
    const Icon = brand.icon;
    const iconSize = Math.round(size * 0.48);
    return (
      <div
        style={{
          ...containerStyle,
          background: brand.bg,
          border: `1px solid ${brand.color}25`,
        }}
      >
        <Icon style={{ width: iconSize, height: iconSize, color: brand.color }} />
      </div>
    );
  }

  if (brand.type === "svg") {
    const Svg = brand.component;
    const svgSize = Math.round(size * 0.56);
    return (
      <div
        style={{
          ...containerStyle,
          background: brand.bg,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Svg size={svgSize} />
      </div>
    );
  }

  // initials
  return (
    <div
      style={{
        ...containerStyle,
        background: brand.bg,
        border: `1px solid ${brand.color}25`,
        fontSize: brand.text.length > 2 ? size * 0.22 : size * 0.26,
        fontWeight: 700,
        color: brand.color,
        letterSpacing: "-0.02em",
      }}
    >
      {brand.text}
    </div>
  );
}
