"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiHeaders, API_URL } from "@/lib/api";
import { useState } from "react";
import { CheckCheck, ClipboardList, Plus, Trash2, Loader2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate: string | null;
}

export function TasksSection({ contactId }: { contactId: string }) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", contactId],
    queryFn: () =>
      fetch(`${API_URL}/tasks?contactId=${contactId}`, {
        headers: getApiHeaders(),
      }).then((r) => (r.ok ? r.json() : [])),
  });

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({ contactId, title }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", contactId] });
      setNewTitle("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (taskId: string) =>
      fetch(`${API_URL}/tasks/${taskId}/toggle`, {
        method: "PUT",
        headers: getApiHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", contactId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) =>
      fetch(`${API_URL}/tasks/${taskId}`, {
        method: "DELETE",
        headers: getApiHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", contactId] });
    },
  });

  const deleteAutomaticMutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/tasks/bulk/automatic`, {
        method: "DELETE",
        headers: getApiHeaders(),
      }).then((r) => (r.ok ? r.json() : { deleted: 0 })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // Marca todas as tarefas pendentes como concluídas
  const markAllMutation = useMutation({
    mutationFn: async () => {
      const pending = taskList.filter((t) => !t.isCompleted);
      await Promise.all(
        pending.map((t) =>
          fetch(`${API_URL}/tasks/${t.id}/toggle`, {
            method: "PUT",
            headers: getApiHeaders(),
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", contactId] });
    },
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (newTitle.trim()) createMutation.mutate(newTitle.trim());
  }

  const taskList = Array.isArray(tasks) ? tasks : [];
  const completedCount = taskList.filter((t: Task) => t.isCompleted).length;
  const totalCount = taskList.length;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const hasAutomaticTasks = taskList.some((t: Task) => t.title === "Tarefa automática");

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shadow-md">
            <ClipboardList className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Tarefas</h2>
            {totalCount > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {completedCount} de {totalCount} concluídas
              </p>
            )}
          </div>
        </div>

        {/* Marcar todas */}
        {totalCount > 0 && !allDone && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/20 disabled:opacity-50"
          >
            {markAllMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCheck className="h-3 w-3" />
            )}
            Marcar todas
          </button>
        )}
        {allDone && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-500">
            <CheckCheck className="h-3 w-3" />
            Tudo concluído
          </span>
        )}
      </div>

      {hasAutomaticTasks && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Tarefas criadas automaticamente por workflow. Elas não serão mais geradas (configuração atual).
          </p>
          <button
            type="button"
            onClick={() => deleteAutomaticMutation.mutate()}
            disabled={deleteAutomaticMutation.isPending}
            className="shrink-0 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
          >
            {deleteAutomaticMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Excluir todas as tarefas automáticas"
            )}
          </button>
        </div>
      )}

      {/* Barra de progresso */}
      {totalCount > 0 && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allDone ? "bg-emerald-500" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Formulário de nova tarefa */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          placeholder="Nova tarefa..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="h-9 flex-1 rounded-xl border border-border bg-background/50 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !newTitle.trim()}
          className="flex h-9 items-center gap-1.5 rounded-xl gradient-primary px-3 text-sm font-medium text-white glow-primary-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Adicionar
        </button>
      </form>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : taskList.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada.</p>
          <p className="text-xs text-muted-foreground/60">Adicione tarefas acima para acompanhar follow-ups.</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {taskList.map((t: Task) => (
            <li
              key={t.id}
              className={`group flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all duration-150 ${
                t.isCompleted
                  ? "border-border/40 bg-muted/20 opacity-60"
                  : "border-border bg-background/30 hover:border-primary/20 hover:bg-primary/[0.03]"
              }`}
            >
              <label className="flex flex-1 cursor-pointer items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    checked={t.isCompleted}
                    onChange={() => toggleMutation.mutate(t.id)}
                    className="sr-only"
                  />
                  <div
                    onClick={() => toggleMutation.mutate(t.id)}
                    className={`flex h-4.5 w-4.5 h-[18px] w-[18px] items-center justify-center rounded-md border-2 transition-all cursor-pointer ${
                      t.isCompleted
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {t.isCompleted && (
                      <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span
                  className={`text-sm truncate transition-colors ${
                    t.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {t.title}
                </span>
              </label>
              <button
                onClick={() => deleteMutation.mutate(t.id)}
                disabled={deleteMutation.isPending}
                className="ml-2 shrink-0 opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-all disabled:opacity-30"
                title="Remover tarefa"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
