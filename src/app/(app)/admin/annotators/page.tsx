
"use client";

import { PageHeader } from "@/components/common/page-header";
import { AnnotatorsView } from "@/components/admin/annotators-view";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { ItemAssignment, Annotation, User as AppUser, AnnotationItem } from "@/lib/types";
import { useEffect, useState } from "react";

export default function AdminAnnotatorsPage() {
    const firestore = useFirestore();
    const [allMainAnnotations, setAllMainAnnotations] = useState<Annotation[] | null>(null);
    const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(true);

    const annotatorsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "users"), where("role", "==", "annotator"));
    }, [firestore]);
    const { data: annotators, isLoading: isLoadingUsers } = useCollection<AppUser>(annotatorsQuery);

    const mainAssignmentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
          collection(firestore, 'itemAssignments'), 
          where('dataset', '==', 'main')
        );
    }, [firestore]);
    const { data: mainAssignments, isLoading: isLoadingAssignments } = useCollection<ItemAssignment>(mainAssignmentsQuery);

    const mainItemsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'annotationItems'), where('dataset', '==', 'main'));
    }, [firestore]);
    const { data: mainItems, isLoading: isLoadingItems } = useCollection<AnnotationItem>(mainItemsQuery);


    useEffect(() => {
        if (!firestore) return;
        if (!mainAssignments) {
            if(!isLoadingAssignments) {
                setAllMainAnnotations([]);
                setIsLoadingAnnotations(false);
            }
            return;
        };

        const fetchAnnotations = async () => {
            setIsLoadingAnnotations(true);
            try {
                const mainAssignmentOriginalIds = new Set(mainAssignments.map(a => a.originalId));
                if (mainAssignmentOriginalIds.size === 0) {
                     setAllMainAnnotations([]);
                     setIsLoadingAnnotations(false);
                     return;
                }

                // We need to check all final collections.
                const finalCollections = ['completedAnnotations', 'overlapAnnotations'];
                const allFinalAnnos : Annotation[] = [];
                
                const ids = Array.from(mainAssignmentOriginalIds);
                const idChunks: string[][] = [];
                for (let i = 0; i < ids.length; i += 10) {
                    idChunks.push(ids.slice(i, i + 10));
                }

                for (const chunk of idChunks) {
                    const subQueries = chunk.map(originalId => where('originalId', '==', originalId));

                    const allQueries = finalCollections.map(coll => {
                        const collectionRef = collection(firestore, coll);
                        return query(collectionRef, where('dataset', '==', 'main'), where('originalId', 'in', chunk));
                    });
                    
                    const snapshots = await Promise.all(allQueries.map(q => getDocs(q)));
                    snapshots.forEach(snapshot => {
                        snapshot.forEach(doc => {
                            allFinalAnnos.push(doc.data() as Annotation);
                        });
                    });
                }

                setAllMainAnnotations(allFinalAnnos);
            } catch (error) {
                console.error("Error fetching annotations:", error);
                setAllMainAnnotations([]);
            } finally {
                setIsLoadingAnnotations(false);
            }
        };

        fetchAnnotations();
    }, [firestore, mainAssignments, isLoadingAssignments]);


    return (
        <>
            <PageHeader title="Annotators" description="Manage annotators and their progress." />
            <AnnotatorsView 
                annotators={annotators} 
                assignments={mainAssignments} 
                annotations={allMainAnnotations}
                items={mainItems}
                isLoading={isLoadingUsers || isLoadingAssignments || isLoadingAnnotations || isLoadingItems} 
            />
        </>
    );
}

    