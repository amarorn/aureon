"use client";

import Link from "next/link";
import { ArrowLeft, Palette, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-4 gap-1 -ml-2 text-muted-foreground" asChild>
          <Link href="/app">
            <ArrowLeft className="size-4" />
            Voltar ao app
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Preferências do aplicativo e atalhos para a sua conta.
        </p>
      </div>

      <Card className="border-white/[0.08] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="size-5" />
            Aparência
          </CardTitle>
          <CardDescription>Tema claro ou escuro neste dispositivo.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Alternar modo claro / escuro</p>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card className="border-white/[0.08] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="size-5" />
            Conta
          </CardTitle>
          <CardDescription>Nome, e-mail e senha ficam no perfil.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/app/profile">Abrir perfil</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/[0.08] bg-white/[0.02] opacity-80">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="size-5" />
            Notificações
          </CardTitle>
          <CardDescription>Em breve: preferências de alertas e e-mail.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nada para configurar por enquanto.</p>
        </CardContent>
      </Card>
    </div>
  );
}
