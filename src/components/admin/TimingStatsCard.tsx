
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer, Hourglass } from "lucide-react";
import type { AnnotatorStat } from "./annotators-view";
import { cn } from "@/lib/utils";

type TimingStatsCardProps = {
  annotator: AnnotatorStat;
  className?: string;
};

const formatDuration = (totalSeconds: number) => {
    if (totalSeconds < 60) return `${Math.round(totalSeconds)}d`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    if (minutes < 60) return `${minutes}m ${seconds}d`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}j ${remainingMinutes}m`;
};


const StatItem = ({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: string, color: string }) => (
    <div className="flex items-center gap-3 rounded-lg border p-3 bg-secondary/30">
        <Icon className={cn("h-6 w-6", color)} />
        <div>
            <p className="text-lg font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    </div>
);

export function TimingStatsCard({ annotator, className }: TimingStatsCardProps) {
  const { timingStats } = annotator;

  const timingItems = [
    {
      icon: Timer,
      label: "Waktu Rata-rata per Item",
      value: formatDuration(timingStats.averageTimeInSeconds),
      color: "text-purple-500",
    },
    {
      icon: Hourglass,
      label: "Total Waktu Anotasi",
      value: formatDuration(timingStats.totalTimeInSeconds),
      color: "text-indigo-500",
    },
  ];

  return (
    <Card className={className}>
        <CardHeader className="pb-4">
             <CardTitle className="text-base">Statistik Waktu (Pilot)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
            {timingItems.map((stat, index) => (
                <StatItem key={index} {...stat} />
            ))}
        </CardContent>
    </Card>
  );
}
