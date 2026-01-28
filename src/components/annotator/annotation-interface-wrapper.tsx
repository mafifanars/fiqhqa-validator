
"use client";

import { AnnotationInterface } from "@/components/annotator/annotation-interface";
import type { AnnotationItem } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/logo";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, limit } from "firebase/firestore";

// This new component is a Client Component that takes `originalId` as a prop.
// It handles all the data fetching logic that was previously in the page.tsx file.
export function AnnotationInterfaceWrapper({ originalId }: { originalId: string }) {
  const firestore = useFirestore();

  const itemQuery = useMemoFirebase(() => {
    if (!firestore || !originalId) return null;
    return query(
        collection(firestore, 'annotationItems'), 
        where('originalId', '==', originalId),
        limit(1)
    );
  }, [firestore, originalId]);

  const { data: items, isLoading, error } = useCollection<AnnotationItem>(itemQuery);
  const item = items?.[0];

  if (isLoading) {
     return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <Logo className="text-2xl" />
            <div className="space-y-2 text-center">
                <p>Memuat item anotasi...</p>
                <Skeleton className="h-4 w-48 mx-auto" />
                <Skeleton className="h-4 w-32 mx-auto" />
            </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
            <div className="text-center text-red-500">
                <h2 className="text-xl font-semibold">Gagal memuat item</h2>
                <p>{error.message}</p>
            </div>
        </div>
    )
  }

  if (!item) {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
            <div className="text-center">
                <h2 className="text-xl font-semibold">Item tidak ditemukan</h2>
                <p>Item anotasi yang diminta tidak dapat ditemukan atau Anda tidak memiliki akses.</p>
            </div>
        </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden">
        <AnnotationInterface item={item} />
    </div>
  );
}
