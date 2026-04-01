import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2 } from "lucide-react";

export default function SignupSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="flex size-14 items-center justify-center rounded-2xl gradient-primary glow-primary-sm mb-6">
        <Sparkles className="size-7 text-white" />
      </div>
      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
        <CheckCircle2 className="size-4" />
        Cadastro recebido
      </div>
      <h1 className="text-2xl font-bold text-center text-foreground mb-2">
        Obrigado pelo interesse no Aureon
      </h1>
      <p className="text-center text-muted-foreground max-w-md mb-8">
        Sua solicitação foi registrada. A equipe comercial e suporte analisará os dados da empresa e entrará em
        contato. O acesso à plataforma será liberado após aprovação.
      </p>
      <Button asChild className="gradient-primary border-0">
        <Link href="/login">Ir para o login</Link>
      </Button>
    </div>
  );
}
