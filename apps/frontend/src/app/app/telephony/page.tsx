"use client";

import { PowerDialer } from "./power-dialer";
import { CallHistory } from "./call-history";
import { Phone } from "lucide-react";
import { TelephonySmsHistory } from "@/components/telephony-sms-history";
import { PageTour } from "@/components/page-tour";

export default function TelephonyPage() {
  return (
    <div className="space-y-8">
      <PageTour tourId="telephony" />
      {/* Page header */}
      <div className="flex items-center gap-4" data-tour="telephony-header">
        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg glow-primary-sm">
          <Phone className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Telefonia</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Power dialer e histórico de chamadas</p>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4" data-tour="telephony-dialer">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Power Dialer
          </h2>
          <PowerDialer />
        </div>
        <div className="space-y-4" data-tour="telephony-history">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Histórico de chamadas
          </h2>
          <CallHistory />
          <TelephonySmsHistory />
        </div>
      </div>
    </div>
  );
}
