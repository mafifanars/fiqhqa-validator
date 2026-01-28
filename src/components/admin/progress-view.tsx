
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Check, Clock, XCircle } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

type ProgressStats = {
    totalEntries: number;
    completedEntries: number;
    nonFatwaEntries: number;
    pendingEntries: number;
};

type ProgressViewProps = {
    stats: ProgressStats | null;
    isLoading: boolean;
};

export function ProgressView({ stats, isLoading }: ProgressViewProps) {

  if (isLoading) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
        </div>
    )
  }

  const currentStats = stats || {
    totalEntries: 0,
    completedEntries: 0,
    nonFatwaEntries: 0,
    pendingEntries: 0,
  };

  const data = [
    { name: 'Completed (Single)', value: currentStats.completedEntries, icon: Check, color: "hsl(var(--primary))" },
    { name: 'Pending (Single)', value: currentStats.pendingEntries, icon: Clock, color: "hsl(var(--muted-foreground))" },
    { name: 'Non-Fatwa (Single)', value: currentStats.nonFatwaEntries, icon: XCircle, color: "hsl(var(--destructive))" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((item) => (
        <Card key={item.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
            <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
             <p className="text-xs text-muted-foreground">
                {currentStats.totalEntries > 0 ? ((item.value / currentStats.totalEntries) * 100).toFixed(1) : 0}% dari data non-overlap
            </p>
            </CardContent>
        </Card>
      ))}

    </div>
  );
}
