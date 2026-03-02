"use client";

import { Card, CardContent } from "@/components/ui/card";

export function WorkflowsList() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">Nenhum workflow configurado.</p>
      </CardContent>
    </Card>
  );
}
