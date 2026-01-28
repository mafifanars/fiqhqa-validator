
'use client';

import { useMemo, useEffect, useState } from 'react';
import React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import type { Annotation, AnnotationItem, User, Verdict, Justification, PrimarySource, SecondarySource } from '@/lib/types';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Star } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const LoadingScreen = () => (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-6 w-3/4" />
        <div className="grid gap-8 mt-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    </div>
);

const DetailCard = ({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) => (
    <Card className={className}>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-foreground">
            {children}
        </CardContent>
    </Card>
);

const SourceDisplay = ({ title, sources, renderSource }: { title: string, sources: any[], renderSource: (source: any, index: number) => React.ReactNode }) => (
    <div>
        <h4 className="font-semibold text-base mb-2">{title}</h4>
        {sources && sources.length > 0 ? (
            <div className="space-y-4">
                {sources.map(renderSource)}
            </div>
        ) : (
            <p className="text-muted-foreground text-sm">Tidak ada.</p>
        )}
    </div>
);

const SourceItem = ({ children }: { children: React.ReactNode }) => (
    <div className="p-3 rounded-md border bg-muted/50 space-y-2 text-sm">{children}</div>
);

const SourceField = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <p className="font-semibold text-xs text-muted-foreground">{label}</p>
        <p className="!mt-0 break-words">{value}</p>
    </div>
);

export function ItemDetailView({ originalId }: { originalId: string }) {
    const firestore = useFirestore();
    
    const [item, setItem] = useState<AnnotationItem | null>(null);
    const [isLoadingItem, setIsLoadingItem] = useState(true);
    const [annotations, setAnnotations] = useState<Annotation[] | null>(null);
    const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(true);

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'users');
    }, [firestore]);

    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

    useEffect(() => {
        if (!firestore || !originalId) return;

        const fetchItem = async () => {
            setIsLoadingItem(true);
            const itemsQuery = query(collection(firestore, 'annotationItems'), where('originalId', '==', originalId));
            const querySnapshot = await getDocs(itemsQuery);
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                const fetchedItem = { id: doc.id, ...doc.data() } as AnnotationItem;
                setItem(fetchedItem);
            } else {
                setItem(null);
            }
            setIsLoadingItem(false);
        };

        fetchItem();
    }, [firestore, originalId]);


    useEffect(() => {
        if (!firestore || !originalId) return;

        const fetchAllAnnotations = async () => {
            setIsLoadingAnnotations(true);
            try {
                const collectionsToFetch = ['annotations', 'completedAnnotations', 'overlapAnnotations', 'pilotAnnotations'];
                const allAnnos: Annotation[] = [];

                for (const collectionName of collectionsToFetch) {
                    const q = query(collection(firestore, collectionName), where('annotationItemId', '==', originalId));
                    const querySnapshot = await getDocs(q);
                    querySnapshot.forEach(doc => {
                        allAnnos.push({ id: doc.id, ...doc.data() } as Annotation);
                    });
                }
                
                const uniqueAnnos = Array.from(new Map(allAnnos.map(anno => [anno.id, anno])).values());
                setAnnotations(uniqueAnnos);

            } catch (error) {
                console.error("Error fetching final annotations:", error);
                setAnnotations([]);
            } finally {
                setIsLoadingAnnotations(false);
            }
        };

        fetchAllAnnotations();
    }, [firestore, originalId]);


    const usersMap = useMemo(() => {
        if (!users) return new Map<string, User>();
        return new Map(users.map(u => [u.id, u]));
    }, [users]);

    const isLoading = isLoadingItem || isLoadingAnnotations || isLoadingUsers;

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!item) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <PageHeader title="Item Tidak Ditemukan" description={`Item dengan ID ${originalId} tidak ada atau telah dihapus.`} />
            </div>
        );
    }
    
    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <PageHeader title={`Detail Item`} description={`ID: ${item.originalId}`} />

            <div className="grid gap-6 mt-6">
                <DetailCard title="Konten Artikel">
                    <div className="max-h-96 overflow-y-auto pr-4 break-words">
                        {item.content.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                    </div>
                </DetailCard>

                <Card>
                    <CardHeader>
                        <CardTitle>Perbandingan Anotasi Final</CardTitle>
                        <CardDescription>
                            Berikut adalah hasil anotasi final yang telah disubmit oleh para annotator untuk item ini.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {annotations && annotations.length > 0 ? (
                            annotations.map(anno => {
                                const annotator = usersMap.get(anno.userId);
                                return (
                                    <div key={anno.id} className="border-t pt-6 first:border-t-0 first:pt-0">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Avatar>
                                                <AvatarImage src={annotator?.avatarUrl} />
                                                <AvatarFallback>{getInitials(annotator?.name || 'A')}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{annotator?.name || 'Unknown Annotator'}</p>
                                                <Badge variant={anno.status === 'completed' ? "default" : "secondary"}>{anno.status}</Badge>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Is Fatwa */}
                                            <Card className="bg-secondary/30">
                                                <CardHeader className="p-4">
                                                    <CardTitle className="text-base">Langkah 1: Penyaringan</CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-4 pt-0">
                                                    {anno.isFatwa ? <Badge>Fatwa/Fikih</Badge> : <Badge variant="destructive">Bukan Fatwa/Fikih</Badge>}
                                                    {anno.isFatwa === false && anno.nonFatwaReason && <p className="text-sm text-muted-foreground mt-2">Alasan: {anno.nonFatwaReason}</p>}
                                                </CardContent>
                                            </Card>

                                            {anno.isFatwa && (
                                                <>
                                                    <Card className="bg-secondary/30">
                                                        <CardHeader className="p-4"><CardTitle className="text-base">Langkah 2: Pertanyaan</CardTitle></CardHeader>
                                                        <CardContent className="space-y-3 p-4 pt-0">
                                                            <div>
                                                                <p className="text-xs font-semibold text-muted-foreground mb-1">Pertanyaan Asli</p>
                                                                <p className="text-sm p-2 border bg-muted rounded-md">{item.question}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-muted-foreground mb-1">Apakah pertanyaan dapat dijawab?</p>
                                                                <Badge variant={anno.isQuestionAnswerable ? 'secondary' : 'destructive'}>{anno.isQuestionAnswerable ? "Ya" : "Tidak"}</Badge>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-muted-foreground mb-1">Apakah pertanyaan perlu revisi?</p>
                                                                <Badge variant={anno.questionNeedsRevision ? 'destructive' : 'secondary'}>{anno.questionNeedsRevision ? "Ya" : "Tidak"}</Badge>
                                                            </div>
                                                            {anno.questionNeedsRevision && (
                                                                <div className="border-l-2 pl-3 ml-1 space-y-3">
                                                                     <div>
                                                                        <p className="text-xs font-semibold text-muted-foreground mb-1">Alasan Revisi</p>
                                                                        <p className="text-sm">{anno.questionRevisionReason === 'other' ? anno.otherRevisionReason : anno.questionRevisionReason}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-semibold text-muted-foreground mb-1">Pertanyaan yang Direvisi</p>
                                                                        <p className="text-sm p-2 border bg-background rounded-md">{anno.question}</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>

                                                    {/* Verdicts */}
                                                    <Card className="bg-secondary/30">
                                                        <CardHeader className="p-4"><CardTitle className="text-base">Langkah 3: Putusan (Verdict)</CardTitle></CardHeader>
                                                        <CardContent className="space-y-3 p-4 pt-0">
                                                            {anno.verdicts.map((v, i) => (
                                                                <SourceItem key={i}>
                                                                    <div className="flex items-center gap-2">
                                                                        <h5 className="font-semibold text-sm">Verdict #{i+1}</h5>
                                                                        {v.is_primary_verdict && <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />}
                                                                    </div>
                                                                    <SourceField label="Label Hukum" value={<Badge variant={v.verdictNeedsRevision ? 'destructive' : 'secondary'}>{v.verdict}</Badge>} />
                                                                    <SourceField label="Jawaban (Verbatim)" value={v.context} />
                                                                </SourceItem>
                                                            ))}
                                                        </CardContent>
                                                    </Card>

                                                    {/* Justifications */}
                                                    <Card className="bg-secondary/30">
                                                        <CardHeader className="p-4"><CardTitle className="text-base">Langkah 4: Justifikasi</CardTitle></CardHeader>
                                                        <CardContent className="space-y-4 p-4 pt-0">
                                                            <SourceDisplay title="Sumber Primer (Qur'an/Hadits)" sources={anno.justifications.primary_sources}
                                                                renderSource={(s, i) => (
                                                                    <SourceItem key={i}>
                                                                        <h5 className="font-semibold text-sm">Sumber Primer #{i+1}</h5>
                                                                        <SourceField label="Tipe" value={s.type} />
                                                                        <SourceField label="Terjemahan Teks" value={s.text_translation} />
                                                                        <SourceField label="Referensi" value={s.reference} />
                                                                    </SourceItem>
                                                                )}
                                                            />
                                                            <Separator />
                                                            <SourceDisplay title="Sumber Sekunder (Kutipan Ulama)" sources={anno.justifications.secondary_sources}
                                                                renderSource={(s, i) => (
                                                                    <SourceItem key={i}>
                                                                        <h5 className="font-semibold text-sm">Sumber Sekunder #{i+1}</h5>
                                                                        <SourceField label="Ulama" value={s.scholar} />
                                                                        <SourceField label="Detail Sumber" value={s.source_detail} />
                                                                        <SourceField label="Kutipan" value={s.quote_verbatim} />
                                                                    </SourceItem>
                                                                )}
                                                            />
                                                        </CardContent>
                                                    </Card>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-muted-foreground py-8">Belum ada anotasi final yang ditemukan untuk item ini.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
