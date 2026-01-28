
"use client";

import { useEffect, useState, useMemo } from 'react';
import { PageHeader } from "@/components/common/page-header";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, getDocs, where } from "firebase/firestore";
import type { ItemAssignment, Annotation, User, AnnotationItem, PrimarySource, SecondarySource } from "@/lib/types";
import { combinations } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DisagreementTable, type Disagreement } from '@/components/admin/disagreement-table';
import { Skeleton } from '@/components/ui/skeleton';
import { AgreementScoreCard, type AgreementScores } from '@/components/admin/agreement-score-card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';


type DisagreementStats = {
    isFatwa: Disagreement[];
    questionNeedsRevision: Disagreement[];
    verdictCount: Disagreement[];
    justificationCount: Disagreement[];
    isQuestionAnswerable: Disagreement[];
    verdictRevisionCount: Disagreement[];
    justificationRevisionCount: Disagreement[];
};

function analyzeAgreement(
    finalAnnos: Annotation[], 
    usersMap: Map<string, string>
): { disagreementStats: DisagreementStats, agreementScores: AgreementScores } {
    if (finalAnnos.length === 0) {
        return {
            disagreementStats: { isFatwa: [], questionNeedsRevision: [], verdictCount: [], justificationCount: [], isQuestionAnswerable: [], verdictRevisionCount: [], justificationRevisionCount: [] },
            agreementScores: { isFatwa: null, questionNeedsRevision: null, verdictCount: null, justificationCount: null, isQuestionAnswerable: null, verdictRevisionCount: null, justificationRevisionCount: null }
        };
    }

    const annosByItem = finalAnnos.reduce((acc, anno) => {
        const key = anno.annotationItemId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(anno);
        return acc;
    }, {} as Record<string, Annotation[]>);

    const disagreementStats: DisagreementStats = { isFatwa: [], questionNeedsRevision: [], verdictCount: [], justificationCount: [], isQuestionAnswerable: [], verdictRevisionCount: [], justificationRevisionCount: [] };
    const agreementCounts: Record<keyof Omit<DisagreementStats, 'disagreements'>, {agreed: number, total: number}> = { isFatwa: {agreed: 0, total: 0}, questionNeedsRevision: {agreed: 0, total: 0}, verdictCount: {agreed: 0, total: 0}, justificationCount: {agreed: 0, total: 0}, isQuestionAnswerable: {agreed: 0, total: 0}, verdictRevisionCount: {agreed: 0, total: 0}, justificationRevisionCount: {agreed: 0, total: 0} };
    
    const disagreementMap: Record<string, Record<string, Disagreement>> = {};

    const addDisagreement = (category: keyof DisagreementStats, originalId: string, user1Name: string, val1: any, user2Name: string, val2: any) => {
        const key = originalId; 

        if (!disagreementMap[category]) disagreementMap[category] = {};

        if (!disagreementMap[category][key]) {
            disagreementMap[category][key] = {
                itemOriginalId: originalId,
                annotatorPair: [], 
                criteria: category,
                details: [],
            };
        }

        const existingDetails = disagreementMap[category][key].details;
        if (!existingDetails.some(d => d.user === user1Name)) {
            existingDetails.push({ user: user1Name, value: val1 });
        }
        if (!existingDetails.some(d => d.user === user2Name)) {
            existingDetails.push({ user: user2Name, value: val2 });
        }
    };


    for (const originalId in annosByItem) {
        const annotations = annosByItem[originalId];
        if (annotations.length < 2) continue;

        const annotatorPairs = combinations(annotations, 2);

        for (const [anno1, anno2] of annotatorPairs) {
            const user1Name = usersMap.get(anno1.userId) || anno1.userId;
            const user2Name = usersMap.get(anno2.userId) || anno2.userId;

            const checkAgreement = (category: keyof DisagreementStats, val1: any, val2: any) => {
                agreementCounts[category].total++;
                if (val1 === val2) {
                    agreementCounts[category].agreed++;
                } else {
                    addDisagreement(category, originalId, user1Name, val1, user2Name, val2);
                }
            };
            
            checkAgreement('isFatwa', anno1.isFatwa, anno2.isFatwa);
            checkAgreement('isQuestionAnswerable', anno1.isQuestionAnswerable, anno2.isQuestionAnswerable);
            checkAgreement('questionNeedsRevision', anno1.questionNeedsRevision, anno2.questionNeedsRevision);
            checkAgreement('verdictCount', anno1.verdicts.length, anno2.verdicts.length);

            const justifCount1 = (anno1.justifications?.primary_sources?.length || 0) + (anno1.justifications?.secondary_sources?.length || 0);
            const justifCount2 = (anno2.justifications?.primary_sources?.length || 0) + (anno2.justifications?.secondary_sources?.length || 0);
            checkAgreement('justificationCount', justifCount1, justifCount2);
            
            const verdictRevisions1 = anno1.verdicts.filter(v => v.verdictNeedsRevision || v.contextNeedsRevision).length;
            const verdictRevisions2 = anno2.verdicts.filter(v => v.verdictNeedsRevision || v.contextNeedsRevision).length;
            checkAgreement('verdictRevisionCount', verdictRevisions1, verdictRevisions2);

            const countJustificationRevisions = (justifications: { primary_sources: PrimarySource[], secondary_sources: SecondarySource[] } | null | undefined) => {
                if (!justifications) return 0;
                const primaryRevisions = justifications.primary_sources?.filter(p => p.referenceNeedsRevision || p.textTranslationNeedsRevision).length || 0;
                const secondaryRevisions = justifications.secondary_sources?.filter(s => s.scholarNeedsRevision || s.sourceDetailNeedsRevision || s.quoteVerbatimNeedsRevision).length || 0;
                return primaryRevisions + secondaryRevisions;
            };
            const justifRevisions1 = countJustificationRevisions(anno1.justifications);
            const justifRevisions2 = countJustificationRevisions(anno2.justifications);
            checkAgreement('justificationRevisionCount', justifRevisions1, justifRevisions2);
        }
    }
    
    disagreementStats.isFatwa = Object.values(disagreementMap.isFatwa || {});
    disagreementStats.isQuestionAnswerable = Object.values(disagreementMap.isQuestionAnswerable || {});
    disagreementStats.questionNeedsRevision = Object.values(disagreementMap.questionNeedsRevision || {});
    disagreementStats.verdictCount = Object.values(disagreementMap.verdictCount || {});
    disagreementStats.verdictRevisionCount = Object.values(disagreementMap.verdictRevisionCount || {});
    disagreementStats.justificationCount = Object.values(disagreementMap.justificationCount || {});
    disagreementStats.justificationRevisionCount = Object.values(disagreementMap.justificationRevisionCount || {});
    
    const calculatePercentage = (category: keyof DisagreementStats) => {
        const { agreed, total } = agreementCounts[category];
        if (total === 0) return null;
        return (agreed / total) * 100;
    }

    const agreementScores = {
        isFatwa: calculatePercentage('isFatwa'),
        isQuestionAnswerable: calculatePercentage('isQuestionAnswerable'),
        questionNeedsRevision: calculatePercentage('questionNeedsRevision'),
        verdictCount: calculatePercentage('verdictCount'),
        verdictRevisionCount: calculatePercentage('verdictRevisionCount'),
        justificationCount: calculatePercentage('justificationCount'),
        justificationRevisionCount: calculatePercentage('justificationRevisionCount'),
    };
    
    return { disagreementStats, agreementScores };
}


export default function AgreementPage() {
    const firestore = useFirestore();

    const assignmentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'itemAssignments'), where('dataset', '==', 'main')) : null, [firestore]);
    const { data: allAssignments, isLoading: isLoadingAssignments } = useCollection<ItemAssignment>(assignmentsQuery);

    const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: allUsers, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

    const itemsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'annotationItems'), where('dataset', '==', 'main')) : null, [firestore]);
    const { data: allItems, isLoading: isLoadingItems } = useCollection<AnnotationItem>(itemsQuery);

    const [finalAnnos, setFinalAnnos] = useState<Annotation[]>([]);
    const [isLoadingAnnos, setIsLoadingAnnos] = useState(true);
    const [analysisResult, setAnalysisResult] = useState<DisagreementStats | null>(null);
    const [agreementScores, setAgreementScores] = useState<AgreementScores | null>(null);
    const [isProcessing, setIsProcessing] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const usersMap = useMemo(() => new Map(allUsers?.map(u => [u.id, u.name]) || []), [allUsers]);
    
    useEffect(() => {
        if (!firestore || isLoadingAssignments || !allAssignments) {
            if(!isLoadingAssignments) {
                setIsLoadingAnnos(false);
                setIsProcessing(false);
            }
            return;
        }

        const fetchAnnotationsForCompletedOverlap = async () => {
            setIsProcessing(true);
            setIsLoadingAnnos(true);

            const assignmentsByOriginalId = (allAssignments || []).reduce((acc, assignment) => {
                if (!acc[assignment.originalId]) {
                    acc[assignment.originalId] = [];
                }
                acc[assignment.originalId].push(assignment);
                return acc;
            }, {} as Record<string, ItemAssignment[]>);
            
            const completedOverlapOriginalIds = Object.keys(assignmentsByOriginalId).filter(originalId => {
                const assignmentsForItem = assignmentsByOriginalId[originalId];
                return assignmentsForItem.length > 1 && assignmentsForItem.every(a => a.status === 'completed' || a.status === 'non-fatwa');
            });

            if (completedOverlapOriginalIds.length === 0) {
                setFinalAnnos([]);
                setIsLoadingAnnos(false);
                setIsProcessing(false);
                setAnalysisResult({ isFatwa: [], questionNeedsRevision: [], verdictCount: [], justificationCount: [], isQuestionAnswerable: [], verdictRevisionCount: [], justificationRevisionCount: [] });
                setAgreementScores({ isFatwa: null, questionNeedsRevision: null, verdictCount: null, justificationCount: null, isQuestionAnswerable: null, verdictRevisionCount: null, justificationRevisionCount: null });
                return;
            }

            try {
                // Since overlap items are always on the 'main' dataset which go to completed/overlap collections
                const collectionsToFetch = ['completedAnnotations', 'overlapAnnotations'];
                const relevantAnnos: Annotation[] = [];
                
                // Batch 'in' queries
                const idChunks: string[][] = [];
                for (let i = 0; i < completedOverlapOriginalIds.length; i += 10) {
                    idChunks.push(completedOverlapOriginalIds.slice(i, i + 10));
                }

                for (const collectionName of collectionsToFetch) {
                    for (const chunk of idChunks) {
                        const q = query(collection(firestore, collectionName), where('annotationItemId', 'in', chunk));
                        const querySnapshot = await getDocs(q);
                        querySnapshot.forEach(doc => {
                            relevantAnnos.push({ id: doc.id, ...doc.data() } as Annotation);
                        });
                    }
                }
                
                const uniqueAnnos = Array.from(new Map(relevantAnnos.map(a => [a.id, a])).values());
                setFinalAnnos(uniqueAnnos);

            } catch (error) {
                console.error("Error fetching final annotations:", error);
            } finally {
                setIsLoadingAnnos(false);
            }
        };

        fetchAnnotationsForCompletedOverlap();
    }, [allAssignments, firestore, isLoadingAssignments]);

    useEffect(() => {
        if (isLoadingAssignments || isLoadingUsers || isLoadingItems || isLoadingAnnos || finalAnnos === null) {
            setIsProcessing(true);
            return;
        }

        const { disagreementStats, agreementScores } = analyzeAgreement(finalAnnos, usersMap);
        setAnalysisResult(disagreementStats);
        setAgreementScores(agreementScores);
        setIsProcessing(false);

    }, [finalAnnos, usersMap, isLoadingAssignments, isLoadingUsers, isLoadingItems, isLoadingAnnos]);

    const handleExportToCSV = () => {
        if (isExporting || !finalAnnos || finalAnnos.length === 0 || !usersMap) return;
        setIsExporting(true);

        const annosByItem = finalAnnos.reduce((acc, anno) => {
             const key = anno.annotationItemId;
            if (!acc[key]) acc[key] = [];
            acc[key].push(anno);
            return acc;
        }, {} as Record<string, Annotation[]>);

        const usersInvolvedIds = [...new Set(finalAnnos.map(a => a.userId))];
        const usersInvolved = usersInvolvedIds.map(uid => ({ id: uid, name: usersMap.get(uid) || uid }));

        const criteria = [
            { key: 'is_fatwa', getValue: (a: Annotation) => a.isFatwa ? 'Yes' : 'No' },
            { key: 'is_q_answerable', getValue: (a: Annotation) => a.isQuestionAnswerable ? 'Yes' : 'No' },
            { key: 'q_needs_revision', getValue: (a: Annotation) => a.questionNeedsRevision ? 'Yes' : 'No' },
            { key: 'verdict_count', getValue: (a: Annotation) => a.verdicts.length },
            { key: 'verdict_revision_count', getValue: (a: Annotation) => a.verdicts.filter(v => v.verdictNeedsRevision || v.contextNeedsRevision).length },
            { key: 'justification_count', getValue: (a: Annotation) => (a.justifications?.primary_sources?.length || 0) + (a.justifications?.secondary_sources?.length || 0) },
            { key: 'justification_revision_count', getValue: (a: Annotation) => {
                    if (!a.justifications) return 0;
                    const p = a.justifications.primary_sources?.filter(ps => ps.referenceNeedsRevision || ps.textTranslationNeedsRevision).length || 0;
                    const s = a.justifications.secondary_sources?.filter(ss => ss.scholarNeedsRevision || ss.sourceDetailNeedsRevision || ss.quoteVerbatimNeedsRevision).length || 0;
                    return p + s;
                }
            },
        ];

        const headers = ['original_id'];
        criteria.forEach(c => {
            usersInvolved.forEach(u => {
                headers.push(`${c.key}_${u.name.replace(/\s+/g, '_').toLowerCase()}`);
            });
        });
        
        const csvRows = [headers.join(',')];

        for (const originalId in annosByItem) {
            const annotations = annosByItem[originalId];
            if (annotations.length < 2) continue; // Only export overlap items

            const row = [originalId];
            
            criteria.forEach(c => {
                usersInvolved.forEach(u => {
                    const userAnno = annotations.find(a => a.userId === u.id);
                    const value = userAnno ? c.getValue(userAnno) : 'N/A';
                    row.push(String(value));
                });
            });
            csvRows.push(row.join(','));
        }
    
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `agreement_analysis_detailed_${new Date().toISOString().split('T')[0]}.csv`);
        setIsExporting(false);
    };

    const renderDisagreementSection = (title: string, data: Disagreement[]) => (
        <Card>
            <CardHeader>
                <CardTitle className='font-semibold text-lg'>{title} ({data.length})</CardTitle>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <DisagreementTable disagreements={data} />
                ) : (
                    <p className='text-sm text-muted-foreground'>Tidak ada ketidaksepakatan ditemukan.</p>
                )}
            </CardContent>
        </Card>
    );

    const isLoading = isLoadingAssignments || isLoadingUsers || isLoadingItems || isLoadingAnnos || isProcessing;

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <PageHeader
                title="Agreement Analysis"
                description="Analisis ketidaksepakatan antar annotator untuk item overlap yang telah selesai."
                actions={
                    <Button onClick={handleExportToCSV} disabled={isLoading || isExporting || !finalAnnos || finalAnnos.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting ? 'Mengekspor...' : 'Export CSV'}
                    </Button>
                }
            />
            
            <div className="space-y-4">
                {isLoading ? (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 7 }).map((_, i) => (
                           <Card key={i}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <Skeleton className="h-5 w-3/5" />
                                    <Skeleton className="h-4 w-4" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-8 w-1/2" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <AgreementScoreCard scores={agreementScores} />
                    </div>
                )}


                {isLoading ? (
                    <div className="mt-8 space-y-6">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                ) : analysisResult ? (
                    <div className='mt-8 space-y-6'>
                        {renderDisagreementSection("Disagreements: 'Is Fatwa'", analysisResult.isFatwa)}
                        {renderDisagreementSection("Disagreements: 'Is Question Answerable'", analysisResult.isQuestionAnswerable)}
                        {renderDisagreementSection("Disagreements: 'Question Needs Revision'", analysisResult.questionNeedsRevision)}
                        {renderDisagreementSection("Disagreements: Verdict Count", analysisResult.verdictCount)}
                        {renderDisagreementSection("Disagreements: Verdict Revision Count", analysisResult.verdictRevisionCount)}
                        {renderDisagreementSection("Disagreements: Justification Count", analysisResult.justificationCount)}
                        {renderDisagreementSection("Disagreements: Justification Revision Count", analysisResult.justificationRevisionCount)}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-10 text-center text-muted-foreground">
                            Tidak ada data overlap yang selesai untuk dianalisis.
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
