
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, MessageSquareQuote, FileText, FileQuestion } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import type { AnnotatorStat } from "./annotators-view"; 
import { cn } from "@/lib/utils";

type TextRevisionStatsCardProps = {
  annotator: AnnotatorStat;
  onClose: () => void;
  className?: string;
};

const StatItem = ({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: number, color: string }) => (
    <div className="flex items-center gap-4 rounded-lg border p-3 bg-secondary/30">
        <Icon className={cn("h-7 w-7", color)} />
        <div>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    </div>
);

export function TextRevisionStatsCard({ annotator, onClose, className }: TextRevisionStatsCardProps) {
  const { name, avatarUrl, revisionStats } = annotator;

  const revisionItems = [
    {
      icon: FileQuestion,
      label: "Revisi Pertanyaan",
      value: revisionStats.questionRevisions,
      color: "text-blue-500",
    },
    {
      icon: MessageSquareQuote,
      label: "Revisi Verdict",
      value: revisionStats.verdictRevisions,
      color: "text-green-500",
    },
    {
      icon: FileText,
      label: "Revisi Justifikasi",
      value: revisionStats.justificationRevisions,
      color: "text-orange-500",
    },
  ];

  return (
    <Card className={cn("relative", className)}>
        <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-7 w-7"
            onClick={onClose}
        >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
        </Button>
        <CardHeader>
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback>{getInitials(name)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-base">{name}</CardTitle>
                </div>
            </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
            <h3 className="text-sm font-medium -mt-2 mb-1">Statistik Revisi Teks</h3>
            {revisionItems.map((stat, index) => (
            <StatItem key={index} {...stat} />
            ))}
        </CardContent>
    </Card>
  );
}
