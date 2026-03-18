"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CalendarDays, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  name: string;
  email: string;
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [type, setType] = useState("meeting");
  const [contactId, setContactId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [addGoogleMeet, setAddGoogleMeet] = useState(true);
  const [addTeamsMeeting, setAddTeamsMeeting] = useState(false);
  const [useZoomMeeting, setUseZoomMeeting] = useState(false);

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () =>
      fetch(`${API_URL}/contacts`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const mutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`${API_URL}/appointments`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(" ") : data.message || "Erro ao criar";
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      router.push("/app/calendar");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !startAt || !endAt) return;
    const payload: Record<string, unknown> = {
      title,
      type,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      ...(contactId && { contactId }),
      ...(location && { location }),
      ...(description && { description }),
      ...(notes && { notes }),
    };
    if (useZoomMeeting) payload.useZoomMeeting = true;
    else if (type === "meeting") {
      payload.addGoogleMeet = addGoogleMeet;
      if (addTeamsMeeting) payload.addTeamsMeeting = true;
    }

    mutation.mutate(payload);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/app/calendar">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl gradient-primary glow-primary-sm">
            <CalendarDays className="size-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Novo agendamento</h1>
            <p className="text-xs text-muted-foreground">Preencha os dados do compromisso</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Geral</h2>

          <div className="space-y-1.5">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ex: Reunião de apresentação"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">Tipo</Label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-foreground transition-all focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            >
              <option value="meeting">Reunião</option>
              <option value="call">Ligação</option>
              <option value="demo">Demo</option>
              <option value="follow_up">Follow-up</option>
              <option value="other">Outro</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact">Contato</Label>
            <select
              id="contact"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-foreground transition-all focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            >
              <option value="">Nenhum contato</option>
              {(contacts as Contact[]).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.email ? `· ${c.email}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date & time */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Data e horário</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="startAt">Início *</Label>
              <Input
                id="startAt"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endAt">Fim *</Label>
              <Input
                id="endAt"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Local / Link</Label>
            <Input
              id="location"
              placeholder="Ex: Sala 3, Google Meet, Zoom..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Videoconferência
            </p>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={useZoomMeeting}
                onChange={(e) => {
                  const v = e.target.checked;
                  setUseZoomMeeting(v);
                  if (v) setAddGoogleMeet(false);
                }}
                className="mt-0.5 size-4 rounded border-white/20 bg-white/5 accent-primary"
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">Criar reunião Zoom</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Gera link Zoom e grava em meetingUrl (integração Zoom conectada).
                </span>
              </span>
            </label>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3",
                useZoomMeeting && "pointer-events-none opacity-50",
              )}
            >
              <input
                type="checkbox"
                checked={addGoogleMeet}
                disabled={useZoomMeeting}
                onChange={(e) => {
                  const v = e.target.checked;
                  setAddGoogleMeet(v);
                  if (v) setUseZoomMeeting(false);
                }}
                className="mt-0.5 size-4 rounded border-white/20 bg-white/5 accent-primary disabled:opacity-50"
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">Adicionar Google Meet</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Ao sincronizar com Google Calendar (tipo reunião). Se Zoom estiver ativo, Meet não é usado.
                </span>
              </span>
            </label>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3",
                useZoomMeeting && "pointer-events-none opacity-50",
              )}
            >
              <input
                type="checkbox"
                checked={addTeamsMeeting}
                disabled={useZoomMeeting}
                onChange={(e) => {
                  const v = e.target.checked;
                  setAddTeamsMeeting(v);
                  if (v) setUseZoomMeeting(false);
                }}
                className="mt-0.5 size-4 rounded border-white/20 bg-white/5 accent-primary disabled:opacity-50"
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">Reunião Microsoft Teams</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Ao sincronizar com Outlook (Microsoft 365). Gera link Teams no evento.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Notes */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Detalhes</h2>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <textarea
              id="description"
              rows={2}
              placeholder="Objetivo do compromisso..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas internas</Label>
            <textarea
              id="notes"
              rows={2}
              placeholder="Anotações privadas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={mutation.isPending} className="flex-1">
            {mutation.isPending ? (
              <><Loader2 className="size-4 animate-spin" />Salvando...</>
            ) : (
              <><CalendarDays className="size-4" />Criar agendamento</>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/app/calendar">Cancelar</Link>
          </Button>
        </div>

        {mutation.isError && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {mutation.error?.message || "Erro ao criar agendamento. Tente novamente."}
          </p>
        )}
      </form>
    </div>
  );
}
