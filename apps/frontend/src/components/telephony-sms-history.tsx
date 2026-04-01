"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getApiHeaders, API_URL } from "@/lib/api";

interface SmsMessage {
  id: string;
  phoneNumber: string;
  direction: string;
  body: string;
  status: string;
  createdAt: string;
  contact?: { id: string; name: string } | null;
}

interface TelephonySmsHistoryProps {
  contactId?: string;
  emptyMessage?: string;
  title?: string;
}

export function TelephonySmsHistory({
  contactId,
  emptyMessage = "Nenhuma mensagem SMS registrada.",
  title = "SMS recebidos",
}: TelephonySmsHistoryProps) {
  const suffix = contactId ? `?contactId=${encodeURIComponent(contactId)}` : "";
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["telephony-sms", contactId ?? "all"],
    queryFn: () =>
      fetch(`${API_URL}/telephony/sms${suffix}`, { headers: getApiHeaders() }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const smsList = Array.isArray(messages) ? messages : [];

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">{title}</h2>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : smsList.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-3">
            {smsList.slice(0, 20).map((sms: SmsMessage) => (
              <li
                key={sms.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border px-3 py-2.5"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {sms.contact?.id ? (
                      <Link
                        href={`/app/contacts/${sms.contact.id}`}
                        className="font-medium hover:underline"
                      >
                        {sms.contact.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{sms.phoneNumber}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {sms.direction === "inbound" ? "Recebido" : "Enviado"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{sms.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {sms.phoneNumber} · {sms.status}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(sms.createdAt).toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
