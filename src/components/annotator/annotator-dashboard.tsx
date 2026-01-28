
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookCheck, FileClock, Hourglass, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "../ui/skeleton";

type DashboardStats = {
    assigned: number;
    pending: number;
    draft: number;
    completed: number;
    nonFatwa: number;
    nextItemOriginalId: string | null;
    completionPercentage: number;
};

type AnnotatorDashboardProps = {
    stats: DashboardStats | null;
    isLoading: boolean;
};

const StatCard = ({ icon: Icon, title, value, description }: { icon: React.ElementType, title: string, value: number, description?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);


export function AnnotatorDashboard({ stats, isLoading }: AnnotatorDashboardProps) {

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-3 w-full" />
                    </div>
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Skeleton className="h-28" />
                        <Skeleton className="h-28" />
                        <Skeleton className="h-28" />
                        <Skeleton className="h-28" />
                    </div>
                    <Skeleton className="h-10 w-48" />
                </CardContent>
            </Card>
        )
    }

    const currentStats = stats || {
        assigned: 0,
        pending: 0,
        draft: 0,
        completed: 0,
        nonFatwa: 0,
        nextItemOriginalId: null,
        completionPercentage: 0,
    };
    
    const totalFinished = currentStats.completed + currentStats.nonFatwa;
    
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progres Anotasi Utama</CardTitle>
        <CardDescription>
          Berikut adalah ringkasan progres anotasi Anda untuk dataset utama.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
            <div className="flex justify-between items-baseline mb-1">
                <p className="text-sm text-muted-foreground">Penyelesaian Tugas</p>
                <p className="text-sm font-semibold">{totalFinished} <span className="text-muted-foreground">/ {currentStats.assigned}</span></p>
            </div>
            <Progress value={currentStats.completionPercentage} className="w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Hourglass} title="Menunggu" value={currentStats.pending} description="Item siap untuk dikerjakan." />
            <StatCard icon={FileClock} title="Draft" value={currentStats.draft} description="Item yang sedang dikerjakan." />
            <StatCard icon={BookCheck} title="Selesai (Fatwa)" value={currentStats.completed} description="Item yang ditandai sebagai fatwa." />
            <StatCard icon={BookCheck} title="Selesai (Bukan Fatwa)" value={currentStats.nonFatwa} description="Item yang ditandai bukan fatwa." />
        </div>
        <div>
            {currentStats.nextItemOriginalId ? (
                 <Button asChild>
                    <Link href={`/annotator/annotate/${currentStats.nextItemOriginalId}`}>
                        {currentStats.pending > 0 ? 'Mulai Tugas Baru' : 'Lanjutkan Draft'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            ) : (
                <p className="text-sm font-medium text-muted-foreground pt-2">
                    {currentStats.assigned > 0 ? "Selamat, semua tugas telah selesai!" : "Anda belum memiliki tugas."}
                </p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
