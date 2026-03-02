"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiHeaders, API_URL } from "@/lib/api";

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  instagram: "Instagram",
  telegram: "Telegram",
  other: "Outro",
};

export function ConversationDetail({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const [messageContent, setMessageContent] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateOpp, setShowCreateOpp] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [oppTitle, setOppTitle] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [attachments, setAttachments] = useState<{ url: string; filename: string }[]>([]);
  const [newAttUrl, setNewAttUrl] = useState("");
  const [newAttFilename, setNewAttFilename] = useState("");

  const { data: conversation, isLoading, error } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () =>
      fetch(`${API_URL}/conversations/${conversationId}`, {
        headers: apiHeaders,
      }).then((r) => (r.ok ? r.json() : null)),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["message-templates"],
    queryFn: () =>
      fetch(`${API_URL}/message-templates`, { headers: apiHeaders }).then((r) =>
        r.ok ? r.json() : []
      ),
  });

  const sendMutation = useMutation({
    mutationFn: (body: {
      content: string;
      templateId?: string;
      templateVariables?: Record<string, string>;
      attachments?: { url: string; filename: string }[];
    }) =>
      fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      setMessageContent("");
      setSelectedTemplateId("");
      setTemplateVars({});
      setAttachments([]);
    },
  });

  const assignMutation = useMutation({
    mutationFn: (assignedTo: string | null) =>
      fetch(`${API_URL}/conversations/${conversationId}/assign`, {
        method: "PUT",
        headers: apiHeaders,
        body: JSON.stringify({ assignedTo }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/conversations/${conversationId}/close`, {
        method: "PUT",
        headers: apiHeaders,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/conversations/${conversationId}/reopen`, {
        method: "PUT",
        headers: apiHeaders,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (title: string) =>
      fetch(`${API_URL}/conversations/${conversationId}/create-task`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      setShowCreateTask(false);
      setTaskTitle("");
    },
  });

  const createOppMutation = useMutation({
    mutationFn: (title: string) =>
      fetch(`${API_URL}/conversations/${conversationId}/create-opportunity`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      setShowCreateOpp(false);
      setOppTitle("");
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) return;
    sendMutation.mutate({
      content: messageContent,
      templateId: selectedTemplateId || undefined,
      templateVariables: Object.keys(templateVars).length ? templateVars : undefined,
      attachments: attachments.length ? attachments : undefined,
    });
  };

  const addAttachment = () => {
    if (newAttUrl.trim() && newAttFilename.trim()) {
      setAttachments((prev) => [
        ...prev,
        { url: newAttUrl.trim(), filename: newAttFilename.trim() },
      ]);
      setNewAttUrl("");
      setNewAttFilename("");
    }
  };

  const handleAssign = () => {
    assignMutation.mutate(assignTo || null);
  };

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (error || !conversation)
    return <p className="text-destructive">Conversa não encontrada.</p>;

  const messages = conversation.messages ?? [];
  const contact = conversation.contact;
  const channel = conversation.channel;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <h1 className="text-xl font-bold">
              <Link href={`/app/contacts/${conversation.contactId}`} className="hover:underline">
                {contact?.name ?? "Contato"}
              </Link>
            </h1>
            <p className="text-sm text-muted-foreground">
              {CHANNEL_LABELS[channel?.type ?? "other"] ?? channel?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2 py-1 text-xs ${
                conversation.status === "open"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {conversation.status === "open" ? "Aberta" : "Fechada"}
            </span>
            {conversation.status === "open" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
              >
                Fechar
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => reopenMutation.mutate()}
                disabled={reopenMutation.isPending}
              >
                Reabrir
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Atribuído a</Label>
              <Input
                placeholder="ID do usuário"
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAssign}
              disabled={assignMutation.isPending}
            >
              Atribuir
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateTask(!showCreateTask)}
            >
              Criar tarefa
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateOpp(!showCreateOpp)}
            >
              Criar oportunidade
            </Button>
          </div>
          {showCreateTask && (
            <div className="flex gap-2 items-end rounded border p-3">
              <div className="flex-1">
                <Label>Título da tarefa</Label>
                <Input
                  placeholder="Ex: Ligar para cliente"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                size="sm"
                onClick={() => taskTitle.trim() && createTaskMutation.mutate(taskTitle.trim())}
                disabled={createTaskMutation.isPending || !taskTitle.trim()}
              >
                Criar
              </Button>
            </div>
          )}
          {showCreateOpp && (
            <div className="flex gap-2 items-end rounded border p-3">
              <div className="flex-1">
                <Label>Título da oportunidade</Label>
                <Input
                  placeholder="Ex: Venda produto X"
                  value={oppTitle}
                  onChange={(e) => setOppTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                size="sm"
                onClick={() => oppTitle.trim() && createOppMutation.mutate(oppTitle.trim())}
                disabled={createOppMutation.isPending || !oppTitle.trim()}
              >
                Criar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Mensagens</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-96 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhuma mensagem ainda.
              </p>
            ) : (
              messages.map(
                (m: {
                  id: string;
                  content: string;
                  direction: string;
                  createdAt: string;
                  attachments?: { url: string; filename: string }[];
                }) => (
                  <div
                    key={m.id}
                    className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        m.direction === "outbound"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                      {m.attachments?.length ? (
                        <div className="mt-2 space-y-1">
                          {m.attachments.map((a: { url: string; filename: string }) => (
                            <a
                              key={a.url}
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs underline"
                            >
                              {a.filename}
                            </a>
                          ))}
                        </div>
                      ) : null}
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(m.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                )
              )
            )}
          </div>

          <form onSubmit={handleSend} className="space-y-3 pt-4 border-t">
            {templates.length > 0 && (
              <div>
                <Label>Template</Label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const t = templates.find((x: { id: string }) => x.id === e.target.value);
                    setSelectedTemplateId(e.target.value);
                    setTemplateVars(
                      (t?.variables ?? []).reduce(
                        (acc: Record<string, string>, v: string) => ({ ...acc, [v]: "" }),
                        {}
                      )
                    );
                    if (t) setMessageContent(t.content);
                  }}
                >
                  <option value="">Nenhum</option>
                  {templates.map((t: { id: string; name: string }) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {selectedTemplateId && Object.keys(templateVars).length > 0 && (
                  <div className="mt-2 space-y-2">
                    {Object.keys(templateVars).map((v) => (
                      <div key={v}>
                        <Label className="text-xs">{v}</Label>
                        <Input
                          value={templateVars[v]}
                          onChange={(e) =>
                            setTemplateVars((prev) => ({ ...prev, [v]: e.target.value }))
                          }
                          placeholder={`{{${v}}}`}
                          className="mt-1 h-8"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div>
              <Label>Mensagem</Label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <Label>Anexos</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  placeholder="URL do arquivo"
                  value={newAttUrl}
                  onChange={(e) => setNewAttUrl(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Nome do arquivo"
                  value={newAttFilename}
                  onChange={(e) => setNewAttFilename(e.target.value)}
                  className="w-40"
                />
                <Button type="button" variant="outline" size="sm" onClick={addAttachment}>
                  Adicionar
                </Button>
              </div>
              {attachments.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {attachments.map((a, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>{a.filename}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-6"
                        onClick={() =>
                          setAttachments((prev) => prev.filter((_, j) => j !== i))
                        }
                      >
                        Remover
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button type="submit" disabled={sendMutation.isPending || !messageContent.trim()}>
              Enviar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
