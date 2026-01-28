
"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import type { Annotation, AnnotationItem, PilotTestSettings, AnnotationItemFile, User as AppUser, ItemAssignment } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useDoc, useMemoFirebase, FirestorePermissionError, errorEmitter } from "@/firebase";
import { collection, query, where, doc, setDoc, getDocs, writeBatch, deleteDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { AnnotatorsView } from "@/components/admin/annotators-view";
import { DataView } from "@/components/admin/data-view";
import { Progress } from "@/components/ui/progress";
import { ExportDialog } from "@/components/admin/export-dialog";
import { saveAs } from 'file-saver';


export default function AdminPilotPage() {
    const { toast } = useToast();
    const firestore = useFirestore();

    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [uploadProgress, setUploadProgress] = useState<{ total: number; loaded: number } | null>(null);
    const [deleteProgress, setDeleteProgress] = useState<{ total: number; loaded: number } | null>(null);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

    const settingsRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'settings', 'pilotTest');
    }, [firestore]);

    const { data: settings, isLoading: isLoadingSettings } = useDoc<PilotTestSettings>(settingsRef);

    const pilotItemsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'annotationItems'), where('dataset', '==', 'pilot'));
    }, [firestore]);
    const { data: pilotItems, isLoading: isLoadingItems } = useCollection<AnnotationItem>(pilotItemsQuery);
    
    const annotatorsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "users"), where("role", "==", "annotator"));
    }, [firestore]);
    const { data: annotators, isLoading: isLoadingUsers } = useCollection<AppUser>(annotatorsQuery);

    const pilotAssignmentsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'itemAssignments'), where('dataset', '==', 'pilot'));
    }, [firestore]);
    const { data: pilotAssignments, isLoading: isLoadingAssignments } = useCollection<ItemAssignment>(pilotAssignmentsQuery);
    
    // Fetch from pilotAnnotations for the chart
    const pilotAnnotationsQuery = useMemoFirebase(() => {
        if(!firestore) return null;
        return collection(firestore, 'pilotAnnotations');
    }, [firestore]);
    const { data: pilotAnnotations, isLoading: isLoadingPilotAnnos } = useCollection<Annotation>(pilotAnnotationsQuery);
    
    const barChartData = useMemo(() => {
        if (!annotators || !pilotAnnotations) return [];

        const annosByUser = pilotAnnotations.reduce((acc, anno) => {
            if (!acc[anno.userId]) {
                acc[anno.userId] = [];
            }
            acc[anno.userId].push(anno);
            return acc;
        }, {} as Record<string, Annotation[]>);

        // Sort annotators by name before mapping to ensure consistent order
        const sortedAnnotators = [...annotators].sort((a, b) => a.name.localeCompare(b.name));

        return sortedAnnotators.map((annotator, index) => {
            const userAnnos = annosByUser[annotator.id] || [];
            const fatwaCount = userAnnos.filter(anno => anno.status === 'completed').length;
            const nonFatwaCount = userAnnos.filter(anno => anno.status === 'non-fatwa').length;
            
            return {
                name: `A-${index + 1}`,
                fullName: annotator.name,
                Fatwa: fatwaCount,
                'Bukan Fatwa': nonFatwaCount,
            };
        });

    }, [annotators, pilotAnnotations]);


    const handleTogglePilot = (isActive: boolean) => {
        if (!settingsRef) return;
        setDoc(settingsRef, { isActive }, { merge: true }).then(() => {
            toast({
                title: "Pilot Test Diperbarui",
                description: `Pilot test telah ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
            });
        }).catch((error: any) => {
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: settingsRef.path,
                    operation: 'update',
                    requestResourceData: { isActive },
                }));
            } else {
                toast({
                    variant: "destructive",
                    title: "Gagal Memperbarui",
                    description: error.message || "Tidak dapat memperbarui status pilot test.",
                });
            }
        });
    };
    
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !firestore) return;

        toast({ title: "File Upload Dimulai", description: `${file.name} sedang diproses untuk pilot test.` });
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
            
            const BATCH_SIZE = 400;
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
                        const q = query(itemsCollectionRef, where("originalId", "==", itemData.id), where("dataset", "==", "pilot"));
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
                                assignmentType: 'global', // Pilot items are global by default
                                dataset: 'pilot'
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

                    if (itemCountInBatch >= BATCH_SIZE || (i === totalLines - 1 && itemCountInBatch > 0)) {
                        const commitPromise = currentBatch.commit();
                        commitPromises.push(commitPromise);
                        currentBatch = writeBatch(firestore);
                        itemCountInBatch = 0;
                        setUploadProgress(prev => ({ ...prev!, loaded: i + 1 }));
                    } else {
                        setUploadProgress(prev => ({ ...prev!, loaded: i + 1 }));
                    }
                }

                await Promise.all(commitPromises);

                toast({ 
                    title: "Upload Berhasil", 
                    description: `${newItemsCount} item baru telah diunggah ke dataset pilot. ${duplicateItemsCount} item duplikat dilewati.` 
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

    const handleDeleteSelectedItems = async () => {
        if (!firestore || !pilotItems || selectedItemIds.length === 0) return;

        const itemsToDelete = pilotItems.filter(item => selectedItemIds.includes(item.id));
        const originalIdsToDelete = itemsToDelete.map(item => item.originalId);
        const totalItemsToDelete = itemsToDelete.length;
        setDeleteProgress({ total: totalItemsToDelete, loaded: 0 });
        
        try {
            const BATCH_SIZE = 400;
            const commitPromises: Promise<void>[] = [];

            // Batch delete from 'annotationItems'
            let itemDeleteBatch = writeBatch(firestore);
            for (let i = 0; i < itemsToDelete.length; i++) {
                itemDeleteBatch.delete(doc(firestore, `annotationItems`, itemsToDelete[i].id));
                if ((i + 1) % BATCH_SIZE === 0 || i === itemsToDelete.length - 1) {
                    commitPromises.push(itemDeleteBatch.commit());
                    itemDeleteBatch = writeBatch(firestore);
                }
                 setDeleteProgress({ total: totalItemsToDelete, loaded: i + 1 });
            }

            // Batch delete related assignments and annotations
            const collectionsToClean = ['itemAssignments', 'annotations', 'pilotAnnotations'];
            for (const collectionName of collectionsToClean) {
                 for (let i = 0; i < originalIdsToDelete.length; i += 10) { // Firestore 'in' query limit is 10
                    const idChunk = originalIdsToDelete.slice(i, i + 10);
                    if (idChunk.length === 0) continue;

                    const q = query(collection(firestore, collectionName), where('annotationItemId', 'in', idChunk));
                    const snapshot = await getDocs(q);
                    let relatedDataBatch = writeBatch(firestore);
                    snapshot.docs.forEach((docToDelete, index) => {
                        relatedDataBatch.delete(docToDelete.ref);
                         if ((index + 1) % BATCH_SIZE === 0 || index === snapshot.docs.length - 1) {
                             commitPromises.push(relatedDataBatch.commit());
                             relatedDataBatch = writeBatch(firestore);
                         }
                    });
                     if (snapshot.docs.length > 0 && snapshot.docs.length % BATCH_SIZE !== 0) {
                        commitPromises.push(relatedDataBatch.commit());
                    }
                 }
            }


            await Promise.all(commitPromises);
            
            toast({ title: "Item Dihapus", description: `${itemsToDelete.length} item pilot dan data terkaitnya telah berhasil dihapus.` });
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
    
        toast({ title: "Ekspor Dimulai", description: "Mengambil anotasi yang sudah selesai dari pilot test..." });
    
        try {
            const allPilotItems = pilotItems || [];
            if (allPilotItems.length === 0) {
                toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ditemukan item pilot untuk diekspor." });
                return;
            }
            
            const pilotItemsMap = new Map(allPilotItems.map(item => [item.originalId, item]));
            
            const completedPilotAnnotationsQuery = query(collection(firestore, 'pilotAnnotations'), where('status', 'in', ['completed', 'non-fatwa']));
            const querySnapshot = await getDocs(completedPilotAnnotationsQuery);
    
            const finalExportData = [];
    
            for (const doc of querySnapshot.docs) {
                const anno = { id: doc.id, ...doc.data() } as Annotation;
                const item = pilotItemsMap.get(anno.annotationItemId);
                if (!item) continue;
    
                if (forML) {
                    if (anno.isFatwa) {
                        const cleanedVerdicts = anno.verdicts.map(v => ({
                            verdict: v.verdict,
                            answer: v.context,
                            is_primary_verdict: v.is_primary_verdict,
                            justification_ids: v.justificationIds || [],
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
                } else {
                    const record: any = {};
                    if (selectedFields.itemId) record.itemId = item.originalId;
                    if (selectedFields.url) record.url = item.url;
                    if (selectedFields.content) record.content = item.content;
                    
                    const filteredAnno: any = {};
                    if (selectedFields.annotatorId) filteredAnno.annotatorId = anno.userId;
                    if (selectedFields.isFatwa) filteredAnno.isFatwa = anno.isFatwa;
                    if (selectedFields.nonFatwaReason && !anno.isFatwa) filteredAnno.nonFatwaReason = anno.nonFatwaReason;
                    if (selectedFields.question) filteredAnno.question = anno.question;
                    if (selectedFields.verdicts) filteredAnno.verdicts = anno.verdicts;
                    if (selectedFields.justifications) filteredAnno.justifications = anno.justifications;
                    
                    record.annotation = filteredAnno;
                    finalExportData.push(record);
                }
            }
    
            if (finalExportData.length === 0) {
                toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ditemukan item pilot yang selesai yang cocok dengan kriteria ekspor." });
                return;
            }
            
            const fileExtension = forML ? 'jsonl' : 'json';
            const fileName = `qafiqih-pilot-export-${new Date().toISOString().split('T')[0]}.${fileExtension}`;
            
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


    const isLoading = isLoadingSettings || isLoadingItems || isLoadingAssignments || isLoadingUsers || isLoadingPilotAnnos;
    const isProcessing = !!uploadProgress || !!deleteProgress;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = barChartData.find(d => d.name === label);
            return (
                <div className="p-2 bg-background border rounded-md shadow-lg">
                    <p className="font-semibold">{data?.fullName}</p>
                    <p className="text-sm text-green-600">{`Fatwa: ${payload[0].value}`}</p>
                    <p className="text-sm text-red-600">{`Bukan Fatwa: ${payload[1].value}`}</p>
                </div>
            );
        }
        return null;
    };

  return (
    <>
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <PageHeader
                title="Manajemen Pilot Test"
                description="Unggah data, pantau progres, dan kelola status pilot test secara global."
            />
            <div className="space-y-4">
                 <div className="grid grid-cols-1 gap-4 lg:grid-cols-7 lg:gap-8">
                    <div className="lg:col-span-7 xl:col-span-4 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Status Pilot Test</CardTitle>
                                <CardDescription>Aktifkan untuk menampilkan tugas pilot di dasbor semua annotator.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoadingSettings ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="pilot-mode"
                                            checked={settings?.isActive || false}
                                            onCheckedChange={handleTogglePilot}
                                        />
                                        <Label htmlFor="pilot-mode" className={settings?.isActive ? "text-primary" : "text-muted-foreground"}>
                                            {settings?.isActive ? "Aktif" : "Nonaktif"}
                                        </Label>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        {isProcessing ? (
                             <Card>
                                <CardContent className="p-6">
                                     {uploadProgress && (
                                        <>
                                            <p className="text-sm font-medium mb-2">Mengunggah file pilot...</p>
                                            <Progress value={(uploadProgress.loaded / uploadProgress.total) * 100} className="w-full" />
                                            <p className="text-xs text-muted-foreground mt-2">{uploadProgress.loaded} dari {uploadProgress.total} item diproses.</p>
                                        </>
                                    )}
                                    {deleteProgress && (
                                        <>
                                            <p className="text-sm font-medium mb-2">Menghapus item pilot...</p>
                                            <Progress value={(deleteProgress.loaded / deleteProgress.total) * 100} className="w-full" />
                                            <p className="text-xs text-muted-foreground mt-2">{deleteProgress.loaded} dari {deleteProgress.total} item dihapus.</p>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                         ) : (
                             <Label
                                htmlFor="jsonl-upload-pilot"
                                className="relative block w-full cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/40 p-12 text-center hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            >
                                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                    <Upload className="h-8 w-8" />
                                    <span className="font-semibold text-primary">
                                        Klik untuk mengunggah data pilot
                                    </span>
                                    <p className="text-sm">JSONL (.jsonl)</p>
                                </div>
                                <Input
                                    id="jsonl-upload-pilot"
                                    type="file"
                                    accept=".jsonl"
                                    className="sr-only"
                                    onChange={handleFileUpload}
                                    disabled={isProcessing}
                                />
                            </Label>
                         )}
                    </div>

                    <div className="lg:col-span-7 xl:col-span-3">
                         {isLoading ? (
                            <Skeleton className="h-full w-full min-h-[300px]" />
                        ) : (
                            <Card className="h-full flex flex-col">
                                <CardHeader>
                                    <CardTitle>Progres Pilot Test per Annotator</CardTitle>
                                    <CardDescription>
                                        Total item selesai oleh setiap annotator.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart
                                            data={barChartData}
                                            margin={{
                                                top: 5,
                                                right: 20,
                                                left: -10,
                                                bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" fontSize={12} />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: '14px' }}/>
                                            <Bar dataKey="Fatwa" stackId="a" fill="hsl(var(--primary))" />
                                            <Bar dataKey="Bukan Fatwa" stackId="a" fill="hsl(var(--destructive))" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                 </div>

                 <AnnotatorsView 
                    annotators={annotators}
                    assignments={pilotAssignments}
                    annotations={pilotAnnotations}
                    items={pilotItems}
                    isLoading={isLoading}
                    isPilotView={true}
                 />

                 <DataView 
                    items={pilotItems || []}
                    assignments={pilotAssignments || []}
                    users={annotators || []}
                    isLoading={isLoading}
                    selectedItemIds={selectedItemIds}
                    setSelectedItemIds={setSelectedItemIds}
                    onDeleteSelected={handleDeleteSelectedItems}
                    onExport={() => setIsExportDialogOpen(true)}
                    datasetType="pilot"
                    isProcessing={isProcessing}
                 />

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
