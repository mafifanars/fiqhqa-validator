
"use client";

import { useMemo, useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader } from "@/components/common/page-header";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Annotation, AnnotationItem, ItemAssignment } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCheck, Clock, FileCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function calculateDashboardStats(
  mainItems: AnnotationItem[] | null,
  mainAssignments: ItemAssignment[] | null,
  completedAnnos: Annotation[] | null
) {
  if (!mainItems || !mainAssignments || !completedAnnos) {
    return {
      totalEntries: 0,
      totalCompletedEntries: 0,
      globalPercentage: 0,
      nonFatwaEntries: 0,
      pendingEntries: 0,
      completedEntries: 0,
      overlapProgress: { total: 0, completed: 0, percentage: 0 }
    };
  }
  
  const singleAssignmentItems = mainItems.filter(item => item.assignmentType !== 'overlap');
  const overlapItems = mainItems.filter(item => item.assignmentType === 'overlap');
  
  const assignmentsByOriginalId = mainAssignments.reduce((acc, assignment) => {
      if (!acc[assignment.originalId]) acc[assignment.originalId] = [];
      acc[assignment.originalId].push(assignment);
      return acc;
  }, {} as Record<string, ItemAssignment[]>);

  const completedSingleOriginalIds = new Set<string>();
  singleAssignmentItems.forEach(item => {
      const assignmentsForItem = assignmentsByOriginalId[item.originalId] || [];
      if (assignmentsForItem.length > 0 && assignmentsForItem.every(a => a.status === 'completed' || a.status === 'non-fatwa')) {
          completedSingleOriginalIds.add(item.originalId);
      }
  });

  const totalCompletedEntries = completedSingleOriginalIds.size;
  const totalEntries = singleAssignmentItems.length;
  const globalPercentage = totalEntries > 0 ? (totalCompletedEntries / totalEntries) * 100 : 0;
  
  let completedFatwaItems = 0;
  let nonFatwaItems = 0;

  const completedAnnosForSingleItems = completedAnnos.filter(anno => completedSingleOriginalIds.has(anno.annotationItemId));

  completedAnnosForSingleItems.forEach(anno => {
      if (anno.status === 'completed') {
          completedFatwaItems++;
      } else if (anno.status === 'non-fatwa') {
          nonFatwaItems++;
      }
  });
  
  const assignedOriginalIds = new Set(mainAssignments.map(a => a.originalId));
  const pendingEntries = mainItems.length - assignedOriginalIds.size;

  const overlapProgress = {
      total: overlapItems.length,
      completed: overlapItems.filter(item => {
          const assignments = assignmentsByOriginalId[item.originalId] || [];
          return assignments.length >= 2 && assignments.every(a => a.status === 'completed' || a.status === 'non-fatwa');
      }).length,
      percentage: 0,
  };
  overlapProgress.percentage = overlapProgress.total > 0 ? (overlapProgress.completed / overlapProgress.total) * 100 : 0;

  return { 
      totalEntries, 
      totalCompletedEntries, 
      globalPercentage, 
      nonFatwaEntries: nonFatwaItems, 
      pendingEntries, 
      completedEntries: completedFatwaItems, 
      overlapProgress 
  };
}

export default function AdminDashboardPage() {
  const firestore = useFirestore();
  const [completedAnnos, setCompletedAnnos] = useState<Annotation[]>([]);
  const [isLoadingCompletedAnnos, setIsLoadingCompletedAnnos] = useState(true);

  const mainItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'annotationItems'), where('dataset', '==', 'main'));
  }, [firestore]);
  const { data: mainItems, isLoading: isLoadingAllItems } = useCollection<AnnotationItem>(mainItemsQuery);

  const mainAssignmentsQuery = useMemoFirebase(() => {
      if(!firestore) return null;
      return query(collection(firestore, 'itemAssignments'), where('dataset', '==', 'main'));
  }, [firestore]);
  const {data: mainAssignments, isLoading: isLoadingAssignments} = useCollection<ItemAssignment>(mainAssignmentsQuery);
  
  useEffect(() => {
      if(!firestore) return;

      const fetchCompletedAnnos = async () => {
          setIsLoadingCompletedAnnos(true);
          const annos: Annotation[] = [];
          try {
              const q = query(collection(firestore, 'completedAnnotations'));
              const snapshot = await getDocs(q);
              snapshot.forEach(doc => annos.push({ id: doc.id, ...doc.data() } as Annotation));
              setCompletedAnnos(annos);
          } catch(e) {
              console.error("Failed to fetch completed annotations", e);
          } finally {
              setIsLoadingCompletedAnnos(false);
          }
      };
      fetchCompletedAnnos();
  }, [firestore]);


  const dashboardStats = useMemo(() => 
    calculateDashboardStats(mainItems, mainAssignments, completedAnnos), 
    [mainItems, mainAssignments, completedAnnos]
  );
  
  const isLoading = isLoadingAllItems || isLoadingAssignments || isLoadingCompletedAnnos;
  const { totalEntries, totalCompletedEntries, globalPercentage, nonFatwaEntries, pendingEntries, completedEntries, overlapProgress } = dashboardStats || {};

  const chartData = [
    { name: 'Fatwa', value: completedEntries || 0, color: 'hsl(var(--primary))' },
    { name: 'Bukan Fatwa', value: nonFatwaEntries || 0, color: 'hsl(var(--destructive))' },
  ];
  
  const totalChartEntries = (completedEntries || 0) + (nonFatwaEntries || 0);

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <PageHeader
        title="Dasbor"
        description="Pantau progres anotasi untuk data global dan overlap."
      />
      <div className="space-y-4">
        {isLoading ? (
            <Skeleton className="h-48 w-full" />
        ) : (
             <Card>
                <CardHeader>
                    <CardTitle>Progres Global (Non-Overlap)</CardTitle>
                    <CardDescription>
                        Status keseluruhan dari {totalEntries || 0} entri data non-overlap.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col justify-center">
                        <div className="text-4xl font-bold">{totalCompletedEntries || 0} / {totalEntries || 0}</div>
                        <p className="text-sm text-muted-foreground">({(globalPercentage || 0).toFixed(1)}%) item selesai</p>
                        <div className="mt-4 space-y-2 text-sm">
                            <p className="font-semibold text-muted-foreground">Rincian Item Selesai:</p>
                            {chartData.map((entry) => (
                                <div key={entry.name} className="flex items-center">
                                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                                    <span>{entry.name}: <strong>{entry.value}</strong></span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="h-[200px] relative">
                         {totalChartEntries === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <p className="text-sm text-muted-foreground">Belum ada data selesai untuk ditampilkan.</p>
                            </div>
                         ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData.filter(d => d.value > 0)}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {chartData.filter(d => d.value > 0).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: "hsl(var(--background))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "var(--radius)",
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                         )}
                    </div>
                </CardContent>
            </Card>
        )}
       
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Progres Data Overlap</CardTitle>
                    <CheckCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-24" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    ) : (
                        <>
                            <div className="text-2xl font-bold">{overlapProgress?.completed || 0} / {overlapProgress?.total || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                item overlap selesai oleh semua.
                            </p>
                        </>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Item Menunggu</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                     {isLoading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{pendingEntries || 0}</div>}
                    <p className="text-xs text-muted-foreground">
                        item menunggu untuk dianotasi.
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Item Selesai (Non-Overlap)</CardTitle>
                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{totalCompletedEntries || 0}</div>}
                    <p className="text-xs text-muted-foreground">
                       item non-overlap ditandai 'Fatwa' atau 'Bukan Fatwa'.
                    </p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
