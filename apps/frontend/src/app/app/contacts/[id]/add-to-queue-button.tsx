"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getApiHeaders, API_URL } from "@/lib/api";

export function AddToQueueButton({ contactId }: { contactId: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      fetch(`${API_URL}/call-queue`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({ contactId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
    },
  });

  return (
    <Button
      variant="outline"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      Adicionar à fila
    </Button>
  );
}
