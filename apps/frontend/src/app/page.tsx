import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";
import { ChatWidget } from "@/components/chat-widget";

export const metadata: Metadata = {
  title: "Aureon — CRM, Automação e Inteligência de Vendas",
  description:
    "Plataforma all-in-one para times de vendas. CRM, inbox multicanal, power dialer, automação de workflows, email marketing e analytics em um só lugar.",
};

export default function Home() {
  return (
    <>
      <LandingPage />
      <ChatWidget />
    </>
  );
}
