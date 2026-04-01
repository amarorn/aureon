"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getApiHeaders, API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const router = useRouter();
  const { user, tenant, refreshSession, logout } = useAuth();
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileOk, setProfileOk] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: "PATCH",
        headers: { ...getApiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(" ") : data.message;
        throw new Error(typeof msg === "string" ? msg : "Não foi possível salvar");
      }
      return data as { user: { name: string } };
    },
    onSuccess: () => {
      setProfileError(null);
      setProfileOk(true);
      void refreshSession();
      setTimeout(() => setProfileOk(false), 4000);
    },
    onError: (e: Error) => {
      setProfileOk(false);
      setProfileError(e.message);
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("As novas senhas não coincidem");
      }
      const res = await fetch(`${API_URL}/auth/me/password`, {
        method: "PUT",
        headers: { ...getApiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(" ") : data.message;
        throw new Error(typeof msg === "string" ? msg : "Não foi possível alterar a senha");
      }
    },
    onSuccess: async () => {
      setPasswordError(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      try {
        sessionStorage.setItem(
          "aureon_login_notice",
          JSON.stringify({ type: "password_ok" }),
        );
      } catch {
        /* ignore */
      }
      await logout();
      router.push("/login");
    },
    onError: (e: Error) => setPasswordError(e.message),
  });

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-4 gap-1 -ml-2 text-muted-foreground" asChild>
          <Link href="/app">
            <ArrowLeft className="size-4" />
            Voltar ao app
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <User className="size-7" />
          Perfil
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dados da sua conta e segurança. O e-mail não pode ser alterado aqui.
        </p>
      </div>

      <Card className="border-white/[0.08] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-lg">Dados pessoais</CardTitle>
          <CardDescription>Nome exibido no sistema e no menu.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={user.email} disabled className="bg-muted/40" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="bg-background/50"
            />
          </div>
          {!user.isPlatformUser && tenant ? (
            <div className="rounded-lg border border-white/[0.06] bg-background/30 px-3 py-2 text-sm">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Organização</p>
              <p className="font-medium">{tenant.name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{tenant.slug}</p>
            </div>
          ) : null}
          {user.isPlatformUser ? (
            <p className="text-xs text-muted-foreground">Conta da equipe Aureon (plataforma).</p>
          ) : null}
          {profileError ? (
            <p className="text-sm text-destructive">{profileError}</p>
          ) : null}
          {profileOk ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Alterações salvas.</p>
          ) : null}
          <Button
            type="button"
            disabled={saveProfile.isPending || !name.trim()}
            onClick={() => saveProfile.mutate()}
          >
            {saveProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar dados"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/[0.08] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-lg">Segurança</CardTitle>
          <CardDescription>
            Ao alterar a senha, todas as sessões serão encerradas e você precisará entrar de novo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Senha atual</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-background/50"
            />
          </div>
          {passwordError ? (
            <p className="text-sm text-destructive">{passwordError}</p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            disabled={
              changePassword.isPending ||
              !currentPassword ||
              newPassword.length < 8 ||
              !confirmPassword
            }
            onClick={() => changePassword.mutate()}
          >
            {changePassword.isPending ? <Loader2 className="size-4 animate-spin" /> : "Alterar senha"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
