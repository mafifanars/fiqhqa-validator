
"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials, cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { AddUserDialog } from "./add-annotator-dialog";
import { Progress } from "@/components/ui/progress";
import type { User as AppUser, ItemAssignment, Annotation, AnnotationItem } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFirestore, FirestorePermissionError, errorEmitter } from "@/firebase";
import { addDoc, collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { TextRevisionStatsCard } from "./TextRevisionStatsCard";
import { EntityCountStatsCard } from "./EntityCountStatsCard";
import { TimingStatsCard } from "./TimingStatsCard";


type RevisionStats = {
  questionRevisions: number;
  verdictRevisions: number;
  justificationRevisions: number;
  totalRevisions: number;
};

type CountDiffStats = {
    verdictsAdded: number;
    verdictsRemoved: number;
    justificationsAdded: number;
    justificationsRemoved: number;
};

type TimingStats = {
    averageTimeInSeconds: number;
    totalTimeInSeconds: number;
};


export type AnnotatorStat = AppUser & { 
    assignedCount: number; 
    completedCount: number; 
    draftCount: number; 
    nonFatwaCount: number; 
    completionPercentage: number;
    totalFinished: number;
    revisionStats: RevisionStats;
    countDiffStats: CountDiffStats; 
    timingStats: TimingStats;
};

type AnnotatorsViewProps = {
  annotators: AppUser[] | null;
  assignments: ItemAssignment[] | null;
  annotations: Annotation[] | null;
  items: AnnotationItem[] | null;
  isLoading: boolean;
  isPilotView?: boolean;
}

function calculateAnnotatorStats(
    annotators: AppUser[],
    assignments: ItemAssignment[],
    annotations: Annotation[],
    items: AnnotationItem[],
    isPilotView: boolean
): AnnotatorStat[] {
    const assignmentsByUser = assignments.reduce((acc, assignment) => {
      const userId = assignment.userId;
      if (!acc[userId]) {
          acc[userId] = [];
      }
      acc[userId].push(assignment);
      return acc;
    }, {} as Record<string, ItemAssignment[]>);
    
    const completedAnnotationsByUser = annotations.reduce((acc, annotation) => {
      const userId = annotation.userId;
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(annotation);
      return acc;
    }, {} as Record<string, Annotation[]>);

    const itemsByOriginalId = new Map(items.map(item => [item.originalId, item]));

    return annotators.map(user => {
      const userAssignments = assignmentsByUser[user.id] || [];
      const userCompletedAnnotations = completedAnnotationsByUser[user.id] || [];

      const assignedCount = userAssignments.length;
      const completedCount = userAssignments.filter(a => a.status === 'completed').length;
      const draftCount = userAssignments.filter(a => a.status === 'draft').length;
      const nonFatwaCount = userAssignments.filter(a => a.status === 'non-fatwa').length;
      const totalFinished = completedCount + nonFatwaCount;
      
      const totalItemsForPercentage = isPilotView ? (items.length) : assignedCount;
      const completionPercentage = totalItemsForPercentage > 0 ? (totalFinished / totalItemsForPercentage) * 100 : 0;
      
      const revisionStats = userCompletedAnnotations.reduce((stats, anno) => {
        if(anno.questionNeedsRevision) stats.questionRevisions++;
        
        anno.verdicts?.forEach(v => {
          if (v.contextNeedsRevision || v.verdictNeedsRevision) {
            stats.verdictRevisions++;
          }
        });

        anno.justifications?.primary_sources?.forEach(ps => {
            if (ps.referenceNeedsRevision || ps.textTranslationNeedsRevision) {
                stats.justificationRevisions++;
            }
        });

        anno.justifications?.secondary_sources?.forEach(ss => {
            if (ss.quoteVerbatimNeedsRevision || ss.scholarNeedsRevision || ss.sourceDetailNeedsRevision) {
                stats.justificationRevisions++;
            }
        });

        return stats;
      }, { questionRevisions: 0, verdictRevisions: 0, justificationRevisions: 0 });

      const totalRevisions = revisionStats.questionRevisions + revisionStats.verdictRevisions + revisionStats.justificationRevisions;
      
      const countDiffStats = userCompletedAnnotations.reduce((stats, anno) => {
          const originalItem = itemsByOriginalId.get(anno.originalId);
          if (originalItem) {
              const originalVerdictCount = originalItem.verdicts?.length || 0;
              const finalVerdictCount = anno.verdicts?.length || 0;
              const verdictDiff = finalVerdictCount - originalVerdictCount;
              if (verdictDiff > 0) stats.verdictsAdded += verdictDiff;
              if (verdictDiff < 0) stats.verdictsRemoved += Math.abs(verdictDiff);

              const originalJustificationCount = (originalItem.justifications?.primary_sources?.length || 0) + (originalItem.justifications?.secondary_sources?.length || 0);
              const finalJustificationCount = (anno.justifications?.primary_sources?.length || 0) + (anno.justifications?.secondary_sources?.length || 0);
              const justificationDiff = finalJustificationCount - originalJustificationCount;
              if (justificationDiff > 0) stats.justificationsAdded += justificationDiff;
              if (justificationDiff < 0) stats.justificationsRemoved += Math.abs(justificationDiff);
          }
          return stats;
      }, { verdictsAdded: 0, verdictsRemoved: 0, justificationsAdded: 0, justificationsRemoved: 0 });
      
      const timingStats = userCompletedAnnotations.reduce((stats, anno) => {
          if (anno.durationSeconds) {
              stats.totalTimeInSeconds += anno.durationSeconds;
              stats.count++;
          }
          return stats;
      }, { totalTimeInSeconds: 0, count: 0 });
      
      const averageTimeInSeconds = timingStats.count > 0 ? timingStats.totalTimeInSeconds / timingStats.count : 0;


      return {
        ...user,
        assignedCount,
        completedCount,
        draftCount,
        nonFatwaCount,
        completionPercentage,
        totalFinished,
        revisionStats: { ...revisionStats, totalRevisions },
        countDiffStats,
        timingStats: {
            averageTimeInSeconds,
            totalTimeInSeconds: timingStats.totalTimeInSeconds
        }
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
}

export function AnnotatorsView({ annotators, assignments, annotations, items, isLoading, isPilotView = false }: AnnotatorsViewProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AnnotatorStat | null>(null);
  const [selectedAnnotator, setSelectedAnnotator] = useState<AnnotatorStat | null>(null);

  const annotatorStats = useMemo(() => {
    if (!annotators || !assignments || !annotations || !items) return [];
    return calculateAnnotatorStats(annotators, assignments, annotations, items, isPilotView);
  }, [annotators, assignments, annotations, items, isPilotView]);

  const handleAddUser = async (values: any) => {
    if (!firestore) {
      toast({
          variant: "destructive",
          title: "Error",
          description: "Layanan Firebase tidak tersedia.",
      });
      return;
    }
    try {
        const usersRef = collection(firestore, "users");
        const q = query(usersRef, where("username", "==", values.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            throw new Error("Pengguna dengan email ini sudah ada.");
        }

        const newUser: Omit<AppUser, 'id'> = {
            name: values.name,
            username: values.email,
            password: values.password, // INSECURE
            role: values.role,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(values.name)}&background=random`
        };
        addDoc(usersRef, newUser).then(() => {
            toast({
                title: "Pengguna Dibuat",
                description: `${values.name} telah ditambahkan sebagai ${values.role}.`,
            });
            setIsAddDialogOpen(false);
        }).catch((error: any) => {
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: usersRef.path,
                    operation: 'create',
                    requestResourceData: newUser
                }));
            } else {
                toast({
                    variant: "destructive",
                    title: "Gagal membuat pengguna",
                    description: error.message || "Terjadi kesalahan yang tidak diketahui.",
                });
            }
        });
    } catch (error: any) { // Catches the manually thrown "user exists" error
        toast({
            variant: "destructive",
            title: "Gagal membuat pengguna",
            description: error.message,
        });
    }
  }

  const handleDeleteUser = async () => {
    if (!firestore || !userToDelete) {
        toast({ variant: "destructive", title: "Error", description: "Layanan Firebase tidak tersedia atau tidak ada pengguna yang dipilih." });
        return;
    }
    try {
        const batch = writeBatch(firestore);
        const userRef = doc(firestore, "users", userToDelete.id);
        batch.delete(userRef);

        const assignmentsQuery = query(collection(firestore, `itemAssignments`), where('userId', '==', userToDelete.id));
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        assignmentsSnapshot.forEach(doc => batch.delete(doc.ref));
        
        const annotationCollections = ['annotations', 'completedAnnotations', 'overlapAnnotations', 'pilotAnnotations'];
        for(const coll of annotationCollections) {
          const annotationsQuery = query(collection(firestore, coll), where('userId', '==', userToDelete.id));
          const annotationsSnapshot = await getDocs(annotationsQuery);
          annotationsSnapshot.forEach(doc => batch.delete(doc.ref));
        }

        batch.commit().then(() => {
            toast({
                title: "Pengguna Dihapus",
                description: "Annotator dan semua data terkaitnya telah dihapus.",
            });
        }).catch((error: any) => {
             if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'users/...',
                    operation: 'delete',
                    requestResourceData: { note: `Batch delete for user ${userToDelete.id}` }
                }));
             } else {
                toast({
                    variant: "destructive",
                    title: "Gagal Menghapus",
                    description: error.message || "Terjadi kesalahan yang tidak diketahui.",
                });
             }
        });
    } catch (error: any) { // Catches errors from getDocs
        console.error("Error preparing user deletion:", error);
        toast({
            variant: "destructive",
            title: "Gagal Mempersiapkan Penghapusan",
            description: error.message || "Tidak dapat mengambil data terkait pengguna untuk dihapus.",
        });
    } finally {
        setIsDeleteDialogOpen(false);
        setUserToDelete(null);
        setSelectedAnnotator(null);
    }
  };

  const openDeleteDialog = (user: AnnotatorStat) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleRowClick = (annotator: AnnotatorStat) => {
    if (selectedAnnotator?.id === annotator.id) {
      setSelectedAnnotator(null);
    } else {
      setSelectedAnnotator(annotator);
    }
  }

  const cardTitle = isPilotView ? "Progres Annotator (Pilot)" : "Progres Annotator";
  const cardDescription = isPilotView 
    ? "Lihat progres setiap annotator untuk dataset pilot test."
    : "Lihat progres setiap akun annotator untuk dataset utama.";

  return (
    <>
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center">
        <div className="grid gap-2 flex-grow">
            <CardTitle>{cardTitle}</CardTitle>
            <CardDescription>{cardDescription}</CardDescription>
        </div>
        {!isPilotView && (
            <Button size="sm" className="ml-auto gap-1 mt-4 md:mt-0" onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="h-3.5 w-3.5" />
                Tambah Annotator
            </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Annotator</TableHead>
                <TableHead className="hidden sm:table-cell">Penyelesaian</TableHead>
                {!isPilotView && <TableHead className="text-center hidden md:table-cell">Ditugaskan</TableHead>}
                <TableHead className="text-center">Selesai</TableHead>
                <TableHead className="text-center hidden md:table-cell">Revisi</TableHead>
                <TableHead className="text-right">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  Array.from({length: 3}).map((_, i) => (
                      <TableRow key={i}>
                          <TableCell className="py-3">
                              <div className="flex items-center gap-3">
                                  <Skeleton className="h-9 w-9 rounded-full" />
                                  <div className="space-y-1">
                                      <Skeleton className="h-4 w-24" />
                                      <Skeleton className="h-3 w-32" />
                                  </div>
                              </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                          {!isPilotView && <TableCell className="text-center hidden md:table-cell"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>}
                          <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                          <TableCell className="text-center hidden md:table-cell"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                  ))
              ) : annotatorStats.length > 0 ? annotatorStats.map((annotator) => {
                const isSelected = selectedAnnotator?.id === annotator.id;
                return (
                  <TableRow 
                    key={annotator.id} 
                    onClick={() => handleRowClick(annotator)}
                    data-state={isSelected ? "selected" : ""}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="hidden h-9 w-9 sm:flex">
                          <AvatarImage src={annotator.avatarUrl} />
                          <AvatarFallback>
                            {getInitials(annotator.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid gap-1">
                          <p className="font-medium">{annotator.name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">
                            {annotator.username}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                          <Progress value={annotator.completionPercentage} className="w-[100px]" />
                          <span className="text-xs text-muted-foreground">{annotator.completionPercentage.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    {!isPilotView && (
                        <TableCell className="text-center font-medium hidden md:table-cell">
                        {annotator.assignedCount}
                        </TableCell>
                    )}
                    <TableCell className="text-center">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{annotator.totalFinished}</Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{annotator.completedCount} Selesai (Fatwa), {annotator.nonFatwaCount} Non-Fatwa</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary">{annotator.revisionStats.totalRevisions}</Badge>
                          </TooltipTrigger>
                          <TooltipContent align="center">
                            <div className="text-sm text-left grid gap-1">
                                <p>Revisi Pertanyaan: <strong>{annotator.revisionStats.questionRevisions}</strong></p>
                                <p>Revisi Verdict: <strong>{annotator.revisionStats.verdictRevisions}</strong></p>
                                <p>Revisi Justifikasi: <strong>{annotator.revisionStats.justificationRevisions}</strong></p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!isPilotView && (
                            <DropdownMenuItem className="text-red-500" onClick={(e) => { e.stopPropagation(); openDeleteDialog(annotator); }}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Hapus Annotator
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={isPilotView ? 5 : 6} className="text-center h-24">
                    Tidak ada annotator ditemukan. Klik 'Tambah Annotator' untuk membuat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    {selectedAnnotator && (
        <div className={cn(
            "mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in-50",
            isPilotView ? "md:grid-cols-3" : "md:grid-cols-2"
        )}>
            <TextRevisionStatsCard 
                annotator={selectedAnnotator} 
                onClose={() => setSelectedAnnotator(null)} 
            />
            <EntityCountStatsCard 
                annotator={selectedAnnotator} 
            />
             {isPilotView && (
                <TimingStatsCard 
                    annotator={selectedAnnotator}
                />
             )}
        </div>
    )}

    <AddUserDialog 
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddUser={handleAddUser}
        initialRole="annotator"
    />

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
                Tindakan ini akan menghapus annotator <span className="font-bold">{userToDelete?.name}</span> secara permanen. Semua data penugasan dan anotasi terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
                Ya, Hapus
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
