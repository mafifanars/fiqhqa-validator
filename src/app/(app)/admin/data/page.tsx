

"use client";

import { PageHeader } from "@/components/common/page-header";
import { DataView } from "@/components/admin/data-view";
import { TaskAssignmentCard } from "@/components/admin/task-assignment-card";
import { useState, useMemo } from "react";
import type { Annotation, AnnotationItem, AnnotationItemFile, User as AppUser, ItemAssignment, AssignmentFormValues } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, FirestorePermissionError, errorEmitter } from "@/firebase";
import { collection, writeBatch, doc, query, where, arrayUnion, arrayRemove, getDocs, deleteDoc } from "firebase/firestore";
import { saveAs } from 'file-saver';
import { ExportDialog } from "@/components/admin/export-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";


export default function AdminDataPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ total: number; loaded: number } | null>(null);
    const [deleteProgress, setDeleteProgress] = useState<{ total: number; loaded: number } | null>(null);

    const itemsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'annotationItems'), where('dataset', '==', 'main'));
    }, [firestore]);
    const { data: items, isLoading: isLoadingItems } = useCollection<AnnotationItem>(itemsQuery);

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, "users");
    }, [firestore]);
    const { data: users, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);
    
    const mainAssignmentsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'itemAssignments'), where('dataset', '==', 'main'));
    }, [firestore]);
    const { data: mainAssignments, isLoading: isLoadingAssignments } = useCollection<ItemAssignment>(mainAssignmentsQuery);

    const annotators = useMemo(() => users?.filter(u => u.role === 'annotator') || [], [users]);

    // Create a map for quick lookup of originalId to Firestore ID
    const originalIdToIdMap = useMemo(() => {
        if (!items) return new Map<string, string>();
        return new Map(items.map(item => [item.originalId, item.id]));
    }, [items]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !firestore) return;

        toast({ title: "File Upload Dimulai", description: `${file.name} sedang diproses.` });
        setUploadProgress({ total: 0, loaded: 0 });

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result;
            if (typeof content !== 'string') {
                toast({ variant: "destructive", title: "File Error", description: "Tidak dapat membaca konten file." });
                setUploadProgress(null);
                return;
            }

            const lines = content.split('\n').filter(line => line.trim() !== '');
            const totalLines = lines.length;
            setUploadProgress({ total: totalLines, loaded: 0 });

            const BATCH_SIZE = 400; // Firestore batch limit is 500
            let currentBatch = writeBatch(firestore);
            let itemCountInBatch = 0;
            let newItemsCount = 0;
            let duplicateItemsCount = 0;
            const commitPromises: Promise<void>[] = [];

            try {
                 for (let i = 0; i < totalLines; i++) {
                    const line = lines[i];
                    try {
                        const itemData = JSON.parse(line) as AnnotationItemFile;
                        
                        const itemsCollectionRef = collection(firestore, "annotationItems");
                        const q = query(itemsCollectionRef, where("originalId", "==", itemData.id), where("dataset", "==", "main"));
                        const existingDocs = await getDocs(q);
                        
                        if (existingDocs.empty) {
                            const newDocRef = doc(itemsCollectionRef);
                            const newItem: Omit<AnnotationItem, 'id'> = {
                                originalId: itemData.id,
                                url: itemData.url,
                                madhab: itemData.madhab,
                                topic: itemData.topic,
                                question: itemData.question,
                                verdicts: (itemData.verdicts || []).map((v: any, index: number) => ({
                                    verdict: v.verdict,
                                    context: v.answer,
                                    is_primary_verdict: v.is_primary_verdict ?? index === 0
                                })),
                                justifications: {
                                    primary_sources: (itemData.justifications?.primary_sources || []).map((ps: any) => ({
                                        type: ps.type,
                                        text_translation: ps.text_translation,
                                        reference: ps.reference || '',
                                    })),
                                    secondary_sources: (itemData.justifications?.secondary_sources || []).map((ss: any) => ({
                                        scholar: ss.scholar || '',
                                        source_detail: ss.source_detail || '',
                                        quote_verbatim: ss.quote_verbatim || '',
                                    })),
                                },
                                content: itemData.context,
                                assignedTo: [],
                                status: 'pending',
                                assignmentType: 'global',
                                dataset: 'main'
                            };
                            currentBatch.set(newDocRef, newItem);
                            itemCountInBatch++;
                            newItemsCount++;
                        } else {
                            duplicateItemsCount++;
                        }
                    } catch (parseError) {
                        console.error("Gagal mem-parsing baris JSON:", line, parseError);
                    }
                    
                    if (itemCountInBatch >= BATCH_SIZE) {
                        commitPromises.push(currentBatch.commit());
                        currentBatch = writeBatch(firestore);
                        itemCountInBatch = 0;
                    }
                    
                    setUploadProgress(prev => ({ ...prev!, loaded: i + 1 }));
                }

                if (itemCountInBatch > 0) {
                  commitPromises.push(currentBatch.commit());
                }

                await Promise.all(commitPromises);
                
                toast({ 
                    title: "Upload Selesai", 
                    description: `${newItemsCount} item baru telah diunggah. ${duplicateItemsCount} item duplikat dilewati.` 
                });

            } catch (error: any) {
                console.error("Error processing file:", error);
                toast({ variant: "destructive", title: "Upload Gagal", description: error.message || "Terjadi kesalahan saat proses unggah." });
            } finally {
                setUploadProgress(null);
                if (event.target) event.target.value = '';
            }
        };

        reader.onerror = () => {
            toast({ variant: "destructive", title: "File Error", description: "Gagal membaca file." });
            setUploadProgress(null);
        }
        reader.readAsText(file);
    };

    const getItemsToProcess = (values: AssignmentFormValues): AnnotationItem[] => {
        if (!items) return [];

        if (values.assignmentType === 'list') {
            const idNumbers = values.idList?.split(/[\n, ]+/).filter(id => id.trim() !== '').map(num => `fiqih${num}`) || [];
            const fullIds = new Set(idNumbers);
            return items.filter(item => fullIds.has(item.originalId));
        }

        if (values.assignmentType === 'range') {
            const { startId, endId } = values;
            if (!startId) return [];

            const sortedItems = [...items].sort((a, b) => a.originalId.localeCompare(b.originalId, undefined, { numeric: true }));

            const startIndex = sortedItems.findIndex(item => item.originalId === startId);
            if (startIndex === -1) {
                toast({ variant: "destructive", title: "ID Tidak Ditemukan", description: `Start ID "${startId}" tidak ditemukan.` });
                return [];
            }
            
            if (!endId || startId === endId) {
                return [sortedItems[startIndex]];
            }

            const endIndex = sortedItems.findIndex(item => item.originalId === endId);
            if (endIndex === -1) {
                toast({ variant: "destructive", title: "ID Tidak Ditemukan", description: `End ID "${endId}" tidak ditemukan.` });
                return [];
            }
            
            if (endIndex < startIndex) {
                toast({ variant: "destructive", title: "Rentang Tidak Valid", description: "End ID harus muncul setelah Start ID dalam urutan data saat ini." });
                return [];
            }

            return sortedItems.slice(startIndex, endIndex + 1);
        }

        return [];
    };

    const handleAssignTasks = (values: AssignmentFormValues) => {
        if (!firestore || !items) return;

        const { annotatorId } = values;
        const annotatorName = users?.find(a => a.id === annotatorId)?.name || 'Unknown';
        
        const itemsToAssign = getItemsToProcess(values);

        if (itemsToAssign.length === 0) {
            toast({ variant: "destructive", title: "Tidak Ada Item Dipilih", description: "Tidak ada item yang cocok dengan kriteria Anda untuk diberikan." });
            return;
        }
        
        const batch = writeBatch(firestore);
        itemsToAssign.forEach(item => {
            if (item.assignedTo.includes(annotatorId)) return; 

            const itemRef = doc(firestore, `annotationItems`, item.id);
            const newAssignedToArray = [...item.assignedTo, annotatorId];
            
            batch.update(itemRef, { 
                assignedTo: arrayUnion(annotatorId), 
                status: 'assigned',
                assignmentType: newAssignedToArray.length > 1 ? 'overlap' : 'global'
            });

            const assignmentCollectionRef = collection(firestore, `itemAssignments`);
            const newAssignmentRef = doc(assignmentCollectionRef);
            const newAssignment: Omit<ItemAssignment, 'id'> = {
                annotationItemId: item.id,
                originalId: item.originalId,
                userId: annotatorId,
                assignedDate: new Date(),
                status: 'pending',
                dataset: 'main'
            };
            batch.set(newAssignmentRef, newAssignment);
        });

        batch.commit().then(() => {
            toast({ title: "Tugas Diberikan", description: `${itemsToAssign.length} item telah diberikan kepada ${annotatorName}.` });
        }).catch((error: any) => {
             console.error("Error assigning tasks:", error);
             if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'annotationItems/...',
                    operation: 'update',
                    requestResourceData: { note: "Batch assign operation" }
                }));
             } else {
                toast({ variant: "destructive", title: "Pemberian Tugas Gagal", description: error.message || "Terjadi kesalahan yang tidak diketahui." });
             }
        });
    }

    const handleUnassignTasks = async (values: AssignmentFormValues) => {
        if (!firestore || !items) return;

        const { annotatorId } = values;
        const annotatorName = users?.find(a => a.id === annotatorId)?.name || 'Unknown';
        const itemsToUnassign = getItemsToProcess(values);

        if (itemsToUnassign.length === 0) {
            toast({ variant: "destructive", title: "Tidak Ada Item Dipilih", description: "Tidak ada item yang cocok dengan kriteria Anda untuk dibatalkan." });
            return;
        }

        try {
            const batch = writeBatch(firestore);
            const assignmentQuery = query(
                collection(firestore, `itemAssignments`),
                where('originalId', 'in', itemsToUnassign.map(i => i.originalId)),
                where('userId', '==', annotatorId)
            );

            const assignmentsSnapshot = await getDocs(assignmentQuery);
            assignmentsSnapshot.forEach(doc => batch.delete(doc.ref));
            
            itemsToUnassign.forEach(item => {
                const itemRef = doc(firestore, `annotationItems`, item.id);
                const newAssignedToArray = item.assignedTo.filter(id => id !== annotatorId);

                batch.update(itemRef, {
                    assignedTo: arrayRemove(annotatorId),
                    status: newAssignedToArray.length === 0 ? 'pending' : 'assigned',
                    assignmentType: newAssignedToArray.length > 1 ? 'overlap' : (newAssignedToArray.length === 1 ? 'global' : 'global')
                });
            });

            batch.commit().then(() => {
                toast({ title: "Tugas Dibatalkan", description: `${itemsToUnassign.length} item telah dibatalkan dari ${annotatorName}.` });
            }).catch((error: any) => {
                 console.error("Error unassigning tasks:", error);
                 if (error.code === 'permission-denied') {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: 'itemAssignments/...',
                        operation: 'delete',
                        requestResourceData: { note: "Batch unassign operation" }
                    }));
                 } else {
                    toast({ variant: "destructive", title: "Pembatalan Tugas Gagal", description: error.message || "Terjadi kesalahan yang tidak diketahui." });
                 }
            });
        } catch (error: any) {
             // This outer catch is for the getDocs call, which is a read operation.
             console.error("Error querying assignments to unassign:", error);
             toast({ variant: "destructive", title: "Gagal Mencari Tugas", description: "Tidak dapat menemukan penugasan yang cocok untuk dibatalkan." });
        }
    }

    const handleDeleteSelectedItems = async () => {
        if (!firestore || !items || selectedItemIds.length === 0) return;

        const itemsToDelete = items.filter(item => selectedItemIds.includes(item.id));
        const originalIdsToDelete = itemsToDelete.map(item => item.originalId);
        const totalItemsToDelete = itemsToDelete.length;
        setDeleteProgress({ total: totalItemsToDelete, loaded: 0 });

        try {
            const BATCH_SIZE = 250; 
            
            for (let i = 0; i < itemsToDelete.length; i += BATCH_SIZE) {
                const batch = writeBatch(firestore);
                const chunk = itemsToDelete.slice(i, i + BATCH_SIZE);
                chunk.forEach(item => {
                    batch.delete(doc(firestore, "annotationItems", item.id));
                });
                await batch.commit(); // Okay to await here as it's part of a larger async operation with progress
                setDeleteProgress({ total: totalItemsToDelete, loaded: i + chunk.length });
            }

            const collectionsToClean = ['itemAssignments', 'annotations', 'completedAnnotations', 'overlapAnnotations', 'pilotAnnotations'];
            for (const collectionName of collectionsToClean) {
                for (let i = 0; i < originalIdsToDelete.length; i += 10) {
                    const idChunk = originalIdsToDelete.slice(i, i + 10);
                    if (idChunk.length === 0) continue;
                    
                    const q = query(collection(firestore, collectionName), where('annotationItemId', 'in', idChunk));
                    const snapshot = await getDocs(q);

                    if (snapshot.empty) continue;
                    
                    for (let j = 0; j < snapshot.docs.length; j += BATCH_SIZE) {
                        const deleteBatch = writeBatch(firestore);
                        const chunk = snapshot.docs.slice(j, j + BATCH_SIZE);
                        chunk.forEach(docToDelete => deleteBatch.delete(docToDelete.ref));
                        await deleteBatch.commit();
                    }
                }
            }
            toast({ title: "Item Dihapus", description: `${totalItemsToDelete} item sumber dan semua data terkaitnya telah berhasil dihapus.` });
            setSelectedItemIds([]);
        } catch (error: any) {
            console.error("Error deleting items:", error);
            toast({ variant: "destructive", title: "Penghapusan Gagal", description: error.message || "Terjadi kesalahan yang tidak diketahui." });
        } finally {
            setDeleteProgress(null);
        }
    };
    
    const handleExport = async (options: { selectedFields: Record<string, boolean>, forML: boolean }) => {
        if (!firestore) return;
        const { selectedFields, forML } = options;

        toast({ title: "Ekspor Dimulai", description: "Mengambil anotasi yang sudah selesai dari dataset utama..." });

        try {
            const allItems = items || [];
            if (allItems.length === 0) {
                toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ditemukan item untuk diekspor." });
                return;
            }
            
            const itemsMap = new Map(allItems.map(item => [item.originalId, item]));
            
            const annotationsByOriginalId: Record<string, Annotation[]> = {};
            const completedAnnotationsQuery = query(collection(firestore, 'completedAnnotations'));
            const querySnapshot = await getDocs(completedAnnotationsQuery);

            querySnapshot.forEach(doc => {
                const anno = { id: doc.id, ...doc.data() } as Annotation;
                if (itemsMap.has(anno.annotationItemId) && itemsMap.get(anno.annotationItemId)?.dataset === 'main') {
                    if (!annotationsByOriginalId[anno.annotationItemId]) {
                        annotationsByOriginalId[anno.annotationItemId] = [];
                    }
                    annotationsByOriginalId[anno.annotationItemId].push(anno);
                }
            });

            const finalExportData = [];

            for (const originalId in annotationsByOriginalId) {
                const item = itemsMap.get(originalId);
                if (!item) continue;

                const annotations = annotationsByOriginalId[originalId];

                if (forML) {
                    for (const anno of annotations) {
                        if (anno.isFatwa) {
                             const cleanedVerdicts = anno.verdicts.map(v => ({
                                verdict: v.verdict,
                                answer: v.context,
                                is_primary_verdict: v.is_primary_verdict,
                                justification_ids: v.justificationIds || []
                            }));

                            const cleanedJustifications = {
                                primary_sources: anno.justifications.primary_sources.map(ps => ({
                                    id: ps.id,
                                    type: ps.type,
                                    text_translation: ps.text_translation,
                                    reference: ps.reference,
                                })),
                                secondary_sources: anno.justifications.secondary_sources.map(ss => ({
                                    id: ss.id,
                                    scholar: ss.scholar,
                                    source_detail: ss.source_detail,
                                    quote_verbatim: ss.quote_verbatim,
                                })),
                            };

                            const cleanedRecord = {
                                id: item.originalId,
                                url: item.url,
                                madhab: item.madhab,
                                topic: item.topic,
                                context: item.content,
                                question: anno.question, 
                                verdicts: cleanedVerdicts,
                                justifications: cleanedJustifications,
                            };
                            finalExportData.push(cleanedRecord);
                        }
                    }
                } else {
                    const record: any = {};
                    if (selectedFields.itemId) record.itemId = item.originalId;
                    if (selectedFields.url) record.url = item.url;
                    if (selectedFields.content) record.content = item.content;
                    
                    record.annotations = annotations.map(anno => {
                        const filteredAnno: any = {};
                        if(selectedFields.annotatorId) filteredAnno.annotatorId = anno.userId;
                        if(selectedFields.isFatwa) filteredAnno.isFatwa = anno.isFatwa;
                        if(selectedFields.nonFatwaReason && !anno.isFatwa) filteredAnno.nonFatwaReason = anno.nonFatwaReason;
                        if(selectedFields.question) filteredAnno.question = anno.question;
                        if(selectedFields.verdicts) filteredAnno.verdicts = anno.verdicts;
                        if(selectedFields.justifications) filteredAnno.justifications = anno.justifications;
                        return filteredAnno;
                    });
                    finalExportData.push(record);
                }
            }

            if (finalExportData.length === 0) {
                 toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ditemukan item yang selesai yang cocok dengan kriteria ekspor." });
                return;
            }
            
            const fileExtension = forML ? 'jsonl' : 'json';
            const fileName = `qafiqih-export-${new Date().toISOString().split('T')[0]}.${fileExtension}`;
            
            let fileContent: string;
            if (forML) {
                fileContent = finalExportData.map(item => JSON.stringify(item)).join('\n');
            } else {
                fileContent = JSON.stringify(finalExportData, null, 2);
            }

            const blob = new Blob([fileContent], { type: forML ? 'application/jsonl' : 'application/json' });
            saveAs(blob, fileName);
            
            toast({ title: "Ekspor Selesai", description: `${finalExportData.length} rekaman berhasil diekspor.` });
            setIsExportDialogOpen(false);
        } catch (error: any) {
            console.error("Export failed:", error);
            toast({ variant: "destructive", title: "Ekspor Gagal", description: error.message || "Gagal mengambil item yang sudah selesai." });
        }
    };
  
    const isProcessing = !!uploadProgress || !!deleteProgress;

  return (
    <>
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <PageHeader
                title="Manajemen Data"
                description="Unggah dataset, berikan tugas, dan ekspor data anotasi."
            />
            {isProcessing ? (
                 <Card>
                    <CardContent className="p-6">
                        {uploadProgress && (
                            <>
                                <p className="text-sm font-medium mb-2">Mengunggah file...</p>
                                <Progress value={(uploadProgress.loaded / uploadProgress.total) * 100} className="w-full" />
                                <p className="text-xs text-muted-foreground mt-2">{uploadProgress.loaded} dari {uploadProgress.total} item diproses.</p>
                            </>
                        )}
                        {deleteProgress && (
                            <>
                                <p className="text-sm font-medium mb-2">Menghapus item...</p>
                                <Progress value={(deleteProgress.loaded / deleteProgress.total) * 100} className="w-full" />
                                <p className="text-xs text-muted-foreground mt-2">{deleteProgress.loaded} dari {deleteProgress.total} item dihapus.</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Label
                    htmlFor="jsonl-upload"
                    className="relative block w-full cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/40 p-12 text-center hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Upload className="h-8 w-8" />
                        <span className="font-semibold text-primary">
                            Klik untuk mengunggah atau seret dan lepas
                        </span>
                        <p className="text-sm">JSONL (.jsonl)</p>
                    </div>
                    <Input
                        id="jsonl-upload"
                        type="file"
                        accept=".jsonl"
                        className="sr-only"
                        onChange={handleFileUpload}
                        disabled={isProcessing}
                    />
                </Label>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-7 lg:gap-8">
                <div className="lg:col-span-7 xl:col-span-4">
                    <DataView 
                        items={items || []}
                        assignments={mainAssignments || []}
                        users={users || []}
                        isLoading={isLoadingItems || isLoadingUsers || isLoadingAssignments}
                        selectedItemIds={selectedItemIds}
                        setSelectedItemIds={setSelectedItemIds}
                        onDeleteSelected={handleDeleteSelectedItems}
                        onExport={() => setIsExportDialogOpen(true)}
                        datasetType="main"
                        isProcessing={isProcessing}
                    />
                </div>
                <div className="lg:col-span-7 xl:col-span-3 space-y-4">
                    <TaskAssignmentCard 
                        annotators={annotators}
                        isLoadingAnnotators={isLoadingUsers}
                        onAssignTasks={handleAssignTasks}
                        onUnassignTasks={handleUnassignTasks}
                    />
                </div>
            </div>
        </div>
        <ExportDialog
            open={isExportDialogOpen}
            onOpenChange={setIsExportDialogOpen}
            onExport={handleExport}
        />
    </>
  );
}
