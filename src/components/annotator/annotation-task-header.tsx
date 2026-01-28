
"use client";

import { useMemo } from "react";
import type { AnnotationItem, ItemAssignment } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";
import { Timer } from "./timer";
import { useUser } from "@/hooks/use-user";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";

type AnnotationTaskHeaderProps = {
  item: AnnotationItem;
  startTime: number | null; // Add startTime prop
  className?: string;
};

export function AnnotationTaskHeader({ item, startTime, className }: AnnotationTaskHeaderProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const isPilot = item.dataset === 'pilot';

  const mainAssignmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isPilot) return null;
    return query(collection(firestore, `itemAssignments`), where('userId', '==', user.id), where('dataset', '==', 'main'));
  }, [firestore, user, isPilot]);
  const { data: mainAssignments, isLoading: isLoadingMainAssignments } = useCollection<ItemAssignment>(mainAssignmentsQuery);

  const pilotItemsQuery = useMemoFirebase(() => {
    if (!firestore || !isPilot) return null;
    return query(collection(firestore, 'annotationItems'), where('dataset', '==', 'pilot'));
  }, [firestore, isPilot]);
  const { data: pilotItems, isLoading: isLoadingPilotItems } = useCollection<AnnotationItem>(pilotItemsQuery);

  const pilotAssignmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isPilot) return null;
    return query(
        collection(firestore, `itemAssignments`),
        where('userId', '==', user.id),
        where('dataset', '==', 'pilot')
    );
  }, [firestore, user, isPilot]);
  const { data: pilotAssignments, isLoading: isLoadingPilotAssignments } = useCollection<ItemAssignment>(pilotAssignmentsQuery);

  const mainStats = useMemo(() => {
      if (!mainAssignments) return null;
      const assigned = mainAssignments.length;
      const completed = mainAssignments.filter(a => a.status === 'completed').length;
      const nonFatwa = mainAssignments.filter(a => a.status === 'non-fatwa').length;
      const totalFinished = completed + nonFatwa;
      const completionPercentage = assigned > 0 ? (totalFinished / assigned) * 100 : 0;
      return { completed: totalFinished, total: assigned, completionPercentage };
  }, [mainAssignments]);

  const pilotStats = useMemo(() => {
      if (!pilotItems || !pilotAssignments) return null;
      const totalItems = pilotItems.length;
      const completedItems = pilotAssignments.filter(a => a.status === 'completed' || a.status === 'non-fatwa').length;
      const completionPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
      return { completed: completedItems, total: totalItems, completionPercentage };
  }, [pilotItems, pilotAssignments]);

  const isLoading = isPilot ? (isLoadingPilotItems || isLoadingPilotAssignments) : isLoadingMainAssignments;
  const progressStats = isPilot ? pilotStats : mainStats;
  let title = isPilot ? "Pilot Test" : "Tugas Anotasi";
  const completedCount = progressStats?.completed ?? 0;
  const totalCount = progressStats?.total ?? 0;
  const progressPercentage = progressStats?.completionPercentage ?? 0;

  return (
    <div className={cn("bg-card border-b p-3", className)}>
        <div className="flex items-center justify-between gap-4">
             <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3">
                    <h1 className="text-base font-semibold truncate">{title}</h1>
                    <p className="text-sm text-muted-foreground font-mono truncate">{item.originalId}</p>
                    {isPilot && startTime && <Timer startTime={startTime} />}
                </div>
                 {isLoading ? (
                    <div className="mt-2 space-y-1">
                        <Skeleton className="h-2 w-16" />
                        <Skeleton className="h-2 w-full" />
                    </div>
                ) : (
                    <div className="mt-1.5 flex items-center gap-2">
                         <span className="text-xs text-muted-foreground font-medium">
                            {completedCount} / {totalCount}
                        </span>
                        <Progress value={progressPercentage} className="h-2 flex-1" />
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
