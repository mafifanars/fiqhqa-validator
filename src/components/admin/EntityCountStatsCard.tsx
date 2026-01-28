
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus } from "lucide-react";
import type { AnnotatorStat } from "./annotators-view";
import { cn } from "@/lib/utils";

type EntityCountStatsCardProps = {
  annotator: AnnotatorStat;
  className?: string;
};

const StatItem = ({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: number, color: string }) => (
    <div className="flex items-center gap-3 rounded-lg border p-2 bg-secondary/30">
        <Icon className={cn("h-6 w-6", color)} />
        <div>
            <p className="text-lg font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    </div>
);

export function EntityCountStatsCard({ annotator, className }: EntityCountStatsCardProps) {
  const { countDiffStats } = annotator;

  const diffItems = [
    {
      icon: Plus,
      label: "Verdict Ditambah",
      value: countDiffStats.verdictsAdded,
      color: "text-sky-500",
    },
    {
      icon: Minus,
      label: "Verdict Dihapus",
      value: countDiffStats.verdictsRemoved,
      color: "text-red-500",
    },
    {
      icon: Plus,
      label: "Justifikasi Ditambah",
      value: countDiffStats.justificationsAdded,
      color: "text-sky-500",
    },
    {
      icon: Minus,
      label: "Justifikasi Dihapus",
      value: countDiffStats.justificationsRemoved,
      color: "text-red-500",
    },
  ];

  return (
    <Card className={className}>
        <CardHeader className="pb-4">
             <CardTitle className="text-base">Perubahan Jumlah Entitas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
            {diffItems.map((stat, index) => (
                <StatItem key={index} {...stat} />
            ))}
        </CardContent>
    </Card>
  );
}
