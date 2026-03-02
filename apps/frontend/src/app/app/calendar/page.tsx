"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHeaders, API_URL } from "@/lib/api";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  // Date range for the current month
  const startDate = new Date(currentYear, currentMonth, 1).toISOString();
  const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["appointments", currentYear, currentMonth],
    queryFn: () =>
      fetch(`${API_URL}/appointments?startDate=${startDate}&endDate=${endDate}`, {
        headers: apiHeaders,
      }).then((r) => (r.ok ? r.json() : [])),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API_URL}/appointments/${id}`, {
        method: "DELETE",
        headers: apiHeaders,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API_URL}/appointments/${id}`, {
        method: "PUT",
        headers: apiHeaders,
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendário</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus agendamentos</p>
        </div>
        <Button asChild>
          <Link href="/app/calendar/new">
            <Plus className="size-4" />
            Novo agendamento
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Calendar Grid */}
        <div className="glass-card rounded-2xl p-6">
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

                  <div className="mt-3 flex items-center gap-2">
                    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", TYPE_COLORS[appt.type])}>
                      {TYPE_LABELS[appt.type]}
                    </span>
                    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium", STATUS_COLORS[appt.status])}>
                      {STATUS_LABELS[appt.status]}
                    </span>
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
