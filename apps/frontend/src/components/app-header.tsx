import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/app" className="text-lg font-semibold">
          Aureon
        </Link>
        <nav className="flex gap-4">
          <Link href="/app/contacts">
            <Button variant="ghost">Contatos</Button>
          </Link>
          <Link href="/app/opportunities">
            <Button variant="ghost">Oportunidades</Button>
          </Link>
          <Link href="/app/inbox">
            <Button variant="ghost">Inbox</Button>
          </Link>
          <Link href="/app/telephony">
            <Button variant="ghost">Telefonia</Button>
          </Link>
          <Link href="/app/automation">
            <Button variant="ghost">Automação</Button>
          </Link>
          <Link href="/app/integrations">
            <Button variant="ghost">Integrações</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Sair
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
