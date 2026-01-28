import { cn } from "@/lib/utils";
import { CheckSquare } from "lucide-react";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-xl font-bold text-foreground", className)}>
      <CheckSquare className="h-6 w-6 text-primary" />
      <h1 className="font-semibold">QAFiqih</h1>
    </div>
  );
}
