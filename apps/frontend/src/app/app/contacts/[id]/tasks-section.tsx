"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiHeaders, API_URL } from "@/lib/api";
import { useState } from "react";

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
        headers: apiHeaders,
      }).then((r) => (r.ok ? r.json() : [])),
  });

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: apiHeaders,
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
        headers: apiHeaders,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", contactId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) =>
      fetch(`${API_URL}/tasks/${taskId}`, {
        method: "DELETE",
        headers: apiHeaders,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", contactId] });
    },
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (newTitle.trim()) createMutation.mutate(newTitle.trim());
  }

  const taskList = Array.isArray(tasks) ? tasks : [];

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">Tarefas</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            placeholder="Nova tarefa"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={createMutation.isPending}>
            Adicionar
          </Button>
        </form>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : taskList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa.</p>
        ) : (
          <ul className="space-y-2">
            {taskList.map((t: Task) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded border px-3 py-2"
              >
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={t.isCompleted}
                    onChange={() => toggleMutation.mutate(t.id)}
                  />
                  <span className={t.isCompleted ? "line-through text-muted-foreground" : ""}>
                    {t.title}
                  </span>
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(t.id)}
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
