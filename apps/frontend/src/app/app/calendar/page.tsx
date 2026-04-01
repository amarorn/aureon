"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  MapPin,
  User,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Download,
  CalendarCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageTour } from "@/components/page-tour";

type AppointmentType = "meeting" | "call" | "demo" | "follow_up" | "other";
type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  type: AppointmentType;
  status: AppointmentStatus;
  location: string | null;
  contact: { id: string; name: string } | null;
  googleEventId?: string | null;
  outlookEventId?: string | null;
}

const TYPE_LABELS: Record<AppointmentType, string> = {
  meeting: "Reunião",
  call: "Ligação",
  demo: "Demo",
  follow_up: "Follow-up",
  other: "Outro",
};

const TYPE_COLORS: Record<AppointmentType, string> = {
  meeting: "bg-violet-400/15 text-violet-400 border-violet-400/20",
  call: "bg-emerald-400/15 text-emerald-400 border-emerald-400/20",
  demo: "bg-blue-400/15 text-blue-400 border-blue-400/20",
  follow_up: "bg-amber-400/15 text-amber-400 border-amber-400/20",
  other: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: "bg-primary/15 text-primary border-primary/20",
  completed: "bg-emerald-400/15 text-emerald-400 border-emerald-400/20",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
  no_show: "bg-amber-400/15 text-amber-400 border-amber-400/20",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function CalendarPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const queryClient = useQueryClient();

  const { data: gcStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["google-calendar-status"],
    queryFn: () =>
      fetch(`${API_URL}/appointments/google-calendar/status`, {
        headers: getApiHeaders(),
      }).then((r) => (r.ok ? r.json() : { connected: false })),
    staleTime: 60_000,
  });

  const { data: outlookStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["outlook-calendar-status"],
    queryFn: () =>
      fetch(`${API_URL}/appointments/outlook-calendar/status`, {
        headers: getApiHeaders(),
      }).then((r) => (r.ok ? r.json() : { connected: false })),
    staleTime: 60_000,
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/appointments/google-calendar/sync`, {
        method: "POST",
        headers: getApiHeaders(),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const importMutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/appointments/google-calendar/import`, {
        method: "POST",
        headers: getApiHeaders(),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const outlookSyncMutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/appointments/outlook-calendar/sync`, {
        method: "POST",
        headers: getApiHeaders(),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const outlookImportMutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/appointments/outlook-calendar/import`, {
        method: "POST",
        headers: getApiHeaders(),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  // Date range for the current month
  const startDate = new Date(currentYear, currentMonth, 1).toISOString();
  const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["appointments", currentYear, currentMonth],
    queryFn: () =>
      fetch(`${API_URL}/appointments?startDate=${startDate}&endDate=${endDate}`, {
        headers: getApiHeaders(),
      }).then((r) => (r.ok ? r.json() : [])),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API_URL}/appointments/${id}`, {
        method: "DELETE",
        headers: getApiHeaders(),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API_URL}/appointments/${id}`, {
        method: "PUT",
        headers: getApiHeaders(),
        body: JSON.stringify({ status: "completed" }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDay(null);
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Group appointments by day
  const byDay: Record<number, Appointment[]> = {};
  for (const a of appointments) {
    const d = new Date(a.startAt).getDate();
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(a);
  }

  const selectedAppointments = selectedDay ? (byDay[selectedDay] ?? []) : appointments;

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  return (
    <div className="flex h-full flex-col space-y-6">
      <PageTour tourId="calendar" />
      {/* Header */}
      <div className="flex items-center justify-between" data-tour="calendar-header">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendário</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus agendamentos</p>
        </div>
        <Button asChild data-tour="calendar-new-btn">
          <Link href="/app/calendar/new">
            <Plus className="size-4" />
            Novo agendamento
          </Link>
        </Button>
      </div>

      {/* Calendar integrations: Google + Outlook */}
      <div className="space-y-3">
        {gcStatus?.connected ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <CalendarCheck className="size-4 shrink-0" />
              Google Agenda conectado
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
              >
                {importMutation.isPending ? <RefreshCw className="size-3 animate-spin" /> : <Download className="size-3" />}
                {importMutation.data ? `${(importMutation.data as { imported?: number }).imported} importados` : "Importar"}
              </button>
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg gradient-primary px-3 py-1.5 text-xs font-medium text-white glow-primary-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {syncMutation.isPending ? <RefreshCw className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                {(() => {
                  const d = syncMutation.data as { synced?: number; failed?: number } | undefined;
                  if (d?.failed && d.failed > 0) return `${d.synced} ok, ${d.failed} falha(s)`;
                  if (d?.synced != null) return `${d.synced} sincronizados`;
                  return "Sincronizar";
                })()}
              </button>
            </div>
            {syncMutation.data && Array.isArray((syncMutation.data as { errors?: string[] }).errors) && (syncMutation.data as { errors: string[] }).errors.length > 0 && (
              <div className="w-full mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <p className="font-medium mb-1">Alguns itens não sincronizaram (veja o terminal do backend)</p>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-200/90">
                  {(syncMutation.data as { errors: string[] }).errors.map((e, i) => (
                    <li key={i} className="break-all">{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertCircle className="size-4 shrink-0 text-amber-400" />
              Conecte Google Agenda ou Outlook para sincronizar agendamentos
            </div>
            <Button asChild size="sm" variant="outline" className="ml-auto border-white/[0.08] bg-white/[0.03] hover:bg-accent text-xs gap-1.5">
              <Link href="/app/integrations"><ExternalLink className="size-3" />Conectar</Link>
            </Button>
          </div>
        )}

        {outlookStatus?.connected ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] px-4 py-3">
            <div className="flex items-center gap-2 text-sky-400 text-sm font-medium">
              <CalendarCheck className="size-4 shrink-0" />
              Microsoft 365 / Outlook conectado
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => outlookImportMutation.mutate()}
                disabled={outlookImportMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
              >
                {outlookImportMutation.isPending ? <RefreshCw className="size-3 animate-spin" /> : <Download className="size-3" />}
                {outlookImportMutation.data ? `${(outlookImportMutation.data as { imported?: number }).imported} importados` : "Importar"}
              </button>
              <button
                onClick={() => outlookSyncMutation.mutate()}
                disabled={outlookSyncMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 transition-opacity disabled:opacity-50"
              >
                {outlookSyncMutation.isPending ? <RefreshCw className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                {(() => {
                  const d = outlookSyncMutation.data as { synced?: number; failed?: number } | undefined;
                  if (d?.failed && d.failed > 0) return `${d.synced} ok, ${d.failed} falha(s)`;
                  if (d?.synced != null) return `${d.synced} sincronizados`;
                  return "Sincronizar";
                })()}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Calendar Grid */}
        <div className="glass-card rounded-2xl p-6" data-tour="calendar-view">
          {/* Month nav */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <h2 className="text-base font-semibold text-foreground">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <button
              onClick={nextMonth}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Day names */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-1 text-center text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const hasAppts = (byDay[day]?.length ?? 0) > 0;
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    "relative flex h-10 w-full flex-col items-center justify-center rounded-lg text-sm font-medium transition-all duration-150",
                    isToday(day) && !isSelected && "border border-primary/40 text-primary",
                    isSelected && "gradient-primary text-white shadow-md glow-primary-sm",
                    !isSelected && !isToday(day) && "text-foreground hover:bg-white/[0.05]"
                  )}
                >
                  {day}
                  {hasAppts && (
                    <span className={cn(
                      "absolute bottom-1 size-1 rounded-full",
                      isSelected ? "bg-white/60" : "bg-primary"
                    )} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 border-t border-white/[0.06] pt-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              Agendamentos
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full border border-primary/40" />
              Hoje
            </div>
          </div>
        </div>

        {/* Appointment list */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {selectedDay
                ? `${selectedDay} de ${MONTH_NAMES[currentMonth]}`
                : "Todos do mês"}
            </h3>
            <span className="text-xs text-muted-foreground">
              {selectedAppointments.length} agendamento{selectedAppointments.length !== 1 ? "s" : ""}
            </span>
          </div>

          {selectedAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
              <CalendarDays className="size-8 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nenhum agendamento</p>
                <p className="text-xs text-muted-foreground/50 mt-0.5">
                  {selectedDay ? "Clique em outro dia ou crie um novo" : "Crie seu primeiro agendamento"}
                </p>
              </div>
              <Button size="sm" asChild>
                <Link href="/app/calendar/new"><Plus className="size-3.5" />Agendar</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className={cn(
                    "glass-card group rounded-xl p-4 transition-all duration-150 hover:border-white/[0.12]",
                    appt.status === "completed" && "opacity-60"
                  )}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className={cn(
                      "text-sm font-semibold leading-tight text-foreground",
                      appt.status === "completed" && "line-through text-muted-foreground"
                    )}>
                      {appt.title}
                    </p>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {appt.status === "scheduled" && (
                        <button
                          onClick={() => completeMutation.mutate(appt.id)}
                          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-emerald-400 transition-colors"
                          title="Marcar como concluído"
                        >
                          <CheckCircle2 className="size-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(appt.id)}
                        className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3 shrink-0" />
                      {formatDate(appt.startAt)} · {formatTime(appt.startAt)} – {formatTime(appt.endAt)}
                    </div>
                    {appt.contact && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="size-3 shrink-0" />
                        <Link href={`/app/contacts/${appt.contact.id}`} className="hover:text-foreground transition-colors">
                          {appt.contact.name}
                        </Link>
                      </div>
                    )}
                    {appt.location && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        {appt.location}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", TYPE_COLORS[appt.type])}>
                      {TYPE_LABELS[appt.type]}
                    </span>
                    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", STATUS_COLORS[appt.status])}>
                      {STATUS_LABELS[appt.status]}
                    </span>
                    {appt.googleEventId && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400">
                        <CalendarCheck className="size-2.5" />
                        Google
                      </span>
                    )}
                    {appt.outlookEventId && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400">
                        <CalendarCheck className="size-2.5" />
                        Outlook
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
