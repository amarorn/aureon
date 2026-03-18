"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ContactsList } from "./contacts-list";
import { Users, UserPlus } from "lucide-react";
import { PageTour } from "@/components/page-tour";

export default function ContactsPage() {
  return (
    <div className="space-y-8">
      <PageTour tourId="contacts" />
      {/* Page header */}
      <div className="flex items-center justify-between" data-tour="contacts-header">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg glow-primary-sm">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie sua base de contatos</p>
          </div>
        </div>
        <Button
          asChild
          data-tour="contacts-new-btn"
          className="gradient-primary text-white glow-primary-sm hover:opacity-90 transition-opacity border-0 gap-2"
        >
          <Link href="/app/contacts/new">
            <UserPlus className="h-4 w-4" />
            Novo contato
          </Link>
        </Button>
      </div>

      {/* Content */}
      <div data-tour="contacts-list">
        <ContactsList />
      </div>
    </div>
  );
}
