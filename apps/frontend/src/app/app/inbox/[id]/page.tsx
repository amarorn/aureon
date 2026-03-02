"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConversationDetail } from "./conversation-detail";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  return (
    <div className="p-8 space-y-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            Voltar
          </Button>
        </div>
        <ConversationDetail conversationId={id} />
    </div>
  );
}
