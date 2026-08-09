import { Loader2, PackageSearch, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function LoadingBlock({ label }: { label: string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-12 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium">{label}</p>
    </Card>
  );
}

export function EmptyBlock({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-12 text-muted-foreground">
      <PackageSearch className="h-8 w-8" />
      <p className="text-sm font-medium">{label}</p>
      {children}
    </Card>
  );
}

export function ErrorBlock({ label }: { label: string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 border-destructive/30 p-12 text-destructive">
      <AlertTriangle className="h-8 w-8" />
      <p className="max-w-md text-center text-sm font-medium">{label}</p>
    </Card>
  );
}