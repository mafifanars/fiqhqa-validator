
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TestTube2 } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "../ui/skeleton";

type PilotStats = {
    totalItems: number;
    completedItems: number;
    nextItemOriginalId: string | null;
    completionPercentage: number;
};

type PilotTestCardProps = {
    stats: PilotStats | null;
    isLoading: boolean;
}

export function PilotTestCard({ stats, isLoading }: PilotTestCardProps) {
  
  if (isLoading) {
    return (
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <TestTube2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-primary">Pilot Test Sedang Aktif</CardTitle>
                </div>
                <CardDescription>Memuat data untuk pilot test...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-10 w-48" />
            </CardContent>
        </Card>
    )
  }

  const currentStats = stats || {
    totalItems: 0,
    completedItems: 0,
    nextItemOriginalId: null,
    completionPercentage: 0,
  };

  return (
    <Card className="bg-primary/5 border-primary/20 animate-in fade-in-50">
        <CardHeader>
             <div className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-primary">Pilot Test Sedang Aktif</CardTitle>
            </div>
          <CardDescription>
            Anda diundang untuk berpartisipasi dalam pilot test. Selesaikan item berikut untuk memberikan masukan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <p className="text-sm mb-2">{currentStats.completedItems} dari {currentStats.totalItems} item pilot selesai</p>
                <Progress value={currentStats.completionPercentage} className="w-full" />
            </div>
            {currentStats.nextItemOriginalId ? (
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href={`/annotator/annotate/${currentStats.nextItemOriginalId}`}>
                    Mulai Kerjakan Pilot Test
                    <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            ) : (
                <p className="text-sm text-muted-foreground">
                    {currentStats.totalItems > 0 ? "Anda telah menyelesaikan semua item pilot. Terima kasih!" : "Belum ada item yang ditugaskan untuk pilot test."}
                </p>
            )}
        </CardContent>
    </Card>
  );
}
