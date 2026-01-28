
"use client";

import { useMemo } from 'react';
import type { ItemAssignment, PilotTestSettings, AnnotationItem, Annotation } from '@/lib/types';
import { PageHeader } from '@/components/common/page-header';
import { AnnotatorDashboard } from '@/components/annotator/annotator-dashboard';
import { useUser } from '@/hooks/use-user';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, limit } from 'firebase/firestore';
import { PilotTestCard } from '@/components/annotator/pilot-test-card';

export default function AnnotatorDashboardPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const firestore = useFirestore();

    // --- Main Assignment Data ---
    const assignmentsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, `itemAssignments`), 
            where('userId', '==', user.id),
            where('dataset', '==', 'main')
        );
    }, [firestore, user]);

    const { data: mainAssignments, isLoading: isLoadingAssignments } = useCollection<ItemAssignment>(assignmentsQuery);
    
    // --- Pilot Test Data ---
    const pilotSettingsRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'settings', 'pilotTest');
    }, [firestore]);
    const { data: pilotSettings, isLoading: isLoadingPilotSettings } = useDoc<PilotTestSettings>(pilotSettingsRef);

    const pilotItemsQuery = useMemoFirebase(() => {
        if (!firestore || !pilotSettings?.isActive) return null; 
        return query(collection(firestore, 'annotationItems'), where('dataset', '==', 'pilot'));
    }, [firestore, pilotSettings?.isActive]);
    const { data: pilotItems, isLoading: isLoadingPilotItems } = useCollection<AnnotationItem>(pilotItemsQuery);

    const pilotAssignmentsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, `itemAssignments`), 
            where('userId', '==', user.id),
            where('dataset', '==', 'pilot')
        );
    }, [firestore, user]);
    const { data: pilotAssignments, isLoading: isLoadingPilotAssignments } = useCollection<ItemAssignment>(pilotAssignmentsQuery);


    const mainStats = useMemo(() => {
        if (!mainAssignments) return null;

        const assigned = mainAssignments.length;
        const completed = mainAssignments.filter(a => a.status === 'completed').length;
        const draft = mainAssignments.filter(a => a.status === 'draft').length;
        const nonFatwa = mainAssignments.filter(a => a.status === 'non-fatwa').length;
        const pending = mainAssignments.filter(a => a.status === 'pending').length;
        
        const totalFinished = completed + nonFatwa;
        const completionPercentage = assigned > 0 ? (totalFinished / assigned) * 100 : 0;

        // Prioritize pending items, then draft items, after sorting.
        const sortedAssignments = [...mainAssignments].sort((a, b) => a.originalId.localeCompare(b.originalId, undefined, { numeric: true }));
        const nextItem = sortedAssignments.find(a => a.status === 'pending') || sortedAssignments.find(a => a.status === 'draft');
        const nextItemOriginalId = nextItem ? nextItem.originalId : null;

        return { assigned, pending, draft, completed, nonFatwa, nextItemOriginalId, completionPercentage };
    }, [mainAssignments]);

    const pilotStats = useMemo(() => {
        if (!pilotItems || !pilotAssignments) return null;

        const totalItems = pilotItems.length;
        const completedAssignments = pilotAssignments.filter(a => a.status === 'completed' || a.status === 'non-fatwa');
        const completedCount = completedAssignments.length;
        const completionPercentage = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;
        
        const completedItemOriginalIds = new Set(completedAssignments.map(a => a.originalId));

        // Sort the pilot items by originalId before finding the next one.
        const sortedPilotItems = [...pilotItems].sort((a, b) => 
            a.originalId.localeCompare(b.originalId, undefined, { numeric: true })
        );

        // Find the first pilot item from the sorted list that has not been completed.
        const nextPilotItem = sortedPilotItems.find(item => !completedItemOriginalIds.has(item.originalId));

        return {
            totalItems,
            completedItems: completedCount,
            nextItemOriginalId: nextPilotItem?.originalId || null,
            completionPercentage: completionPercentage
        };
    }, [pilotItems, pilotAssignments]);


    const isLoading = isUserLoading || isLoadingAssignments || isLoadingPilotSettings || isLoadingPilotItems || isLoadingPilotAssignments;

    if (isUserLoading) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-80" />
                    </div>
                </div>
                 <div className="mt-8">
                    <AnnotatorDashboard stats={null} isLoading={true} />
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <PageHeader
                title={`Selamat Datang, ${user?.name || user?.username?.split('@')[0] || 'User'}!`}
                description="Berikut adalah ringkasan tugas anotasi Anda."
            />
            <div className="mt-8 space-y-8">
                {pilotSettings?.isActive ? (
                    <PilotTestCard stats={pilotStats} isLoading={isLoading} />
                ) : (
                    <AnnotatorDashboard stats={mainStats} isLoading={isLoadingAssignments} />
                )}
            </div>
        </div>
    );
}
