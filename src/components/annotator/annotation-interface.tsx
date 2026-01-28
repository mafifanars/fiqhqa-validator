

"use client";

import type { Annotation, AnnotationItem, Verdict, Justification, PrimarySource, SecondarySource, ItemAssignment, QuestionRevisionReason } from "@/lib/types";
import { useReducer, useState, useCallback, useEffect, useMemo } from "react";
import { ArticleViewer } from "./article-viewer";
import { AnnotationForm } from "./annotation-form";
import { Button } from "@/components/ui/button";
import { Save, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { useUser } from "@/hooks/use-user";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, limit, writeBatch } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { AnnotationTaskHeader } from "./annotation-task-header";


type State = Omit<Annotation, 'id' | 'annotationItemId' | 'userId' | 'createdAt' | 'updatedAt'>;

type Action =
  | { type: 'SET_ENTIRE_STATE', payload: State }
  | { type: 'UPDATE_FIELD', payload: { field: keyof Omit<State, 'status'>, value: any } }
  | { type: 'UPDATE_VERDICT', payload: { index: number, verdict: Partial<Verdict> } }
  | { type: 'ADD_VERDICT' }
  | { type: 'DELETE_VERDICT', payload: { index: number } }
  | { type: 'SET_PRIMARY_VERDICT', payload: { index: number } }
  | { type: 'UPDATE_PRIMARY_SOURCE', payload: { index: number, source: Partial<PrimarySource> } }
  | { type: 'ADD_PRIMARY_SOURCE' }
  | { type: 'DELETE_PRIMARY_SOURCE', payload: { index: number } }
  | { type: 'UPDATE_SECONDARY_SOURCE', payload: { index: number, source: Partial<SecondarySource> } }
  | { type: 'ADD_SECONDARY_SOURCE' }
  | { type: 'DELETE_SECONDARY_SOURCE', payload: { index: number } }
  | { type: 'TOGGLE_VERDICT_JUSTIFICATION', payload: { verdictIndex: number, justificationId: string } };

function annotationReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_ENTIRE_STATE':
        return action.payload;
    case 'UPDATE_FIELD':
      if (action.payload.field === 'questionNeedsRevision' && action.payload.value === false) {
        // If question doesn't need revision, clear the reason fields
        return { ...state, questionNeedsRevision: false, questionRevisionReason: null, otherRevisionReason: '' };
      }
      return { ...state, [action.payload.field]: action.payload.value };
    case 'UPDATE_VERDICT': {
      const newVerdicts = [...state.verdicts];
      newVerdicts[action.payload.index] = { ...newVerdicts[action.payload.index], ...action.payload.verdict };
      return { ...state, verdicts: newVerdicts };
    }
    case 'ADD_VERDICT':
      return { ...state, verdicts: [...state.verdicts, { verdict: '', context: '', verdictNeedsRevision: false, contextNeedsRevision: false, is_primary_verdict: state.verdicts.length === 0, justificationIds: [] }] };
    case 'DELETE_VERDICT': {
        const newVerdicts = state.verdicts.filter((_, i) => i !== action.payload.index);
        // If the deleted verdict was primary, make the first one primary
        if (newVerdicts.length > 0 && !newVerdicts.some(v => v.is_primary_verdict)) {
            newVerdicts[0].is_primary_verdict = true;
        }
        return { ...state, verdicts: newVerdicts };
    }
    
    case 'SET_PRIMARY_VERDICT': {
        const newVerdicts = state.verdicts.map((verdict, index) => ({
            ...verdict,
            is_primary_verdict: index === action.payload.index
        }));
        return { ...state, verdicts: newVerdicts };
    }
    
    case 'TOGGLE_VERDICT_JUSTIFICATION': {
        const { verdictIndex, justificationId } = action.payload;
        const newVerdicts = [...state.verdicts];
        const verdict = newVerdicts[verdictIndex];
        const currentIds = verdict.justificationIds || [];
        const isLinked = currentIds.includes(justificationId);

        if (isLinked) {
            verdict.justificationIds = currentIds.filter(id => id !== justificationId);
        } else {
            verdict.justificationIds = [...currentIds, justificationId];
        }
        return { ...state, verdicts: newVerdicts };
    }


    // Justifications
    case 'UPDATE_PRIMARY_SOURCE': {
        const newSources = [...state.justifications.primary_sources];
        newSources[action.payload.index] = {...newSources[action.payload.index], ...action.payload.source };
        return { ...state, justifications: { ...state.justifications, primary_sources: newSources } };
    }
    case 'ADD_PRIMARY_SOURCE': {
        const newId = `p_${Date.now()}`;
        const newSources = [...state.justifications.primary_sources, {id: newId, type: 'Hadits', text_translation: '', reference: '', textTranslationNeedsRevision: false, referenceNeedsRevision: false}];
        return { ...state, justifications: { ...state.justifications, primary_sources: newSources } };
    }
    case 'DELETE_PRIMARY_SOURCE': {
        const sourceToDelete = state.justifications.primary_sources[action.payload.index];
        const newSources = state.justifications.primary_sources.filter((_, i) => i !== action.payload.index);
        // Remove the deleted justification ID from all verdicts
        const newVerdicts = state.verdicts.map(v => ({
            ...v,
            justificationIds: v.justificationIds?.filter(id => id !== sourceToDelete.id)
        }));
        return { ...state, verdicts: newVerdicts, justifications: { ...state.justifications, primary_sources: newSources } };
    }

    case 'UPDATE_SECONDARY_SOURCE': {
        const newSources = [...state.justifications.secondary_sources];
        newSources[action.payload.index] = {...newSources[action.payload.index], ...action.payload.source };
        return { ...state, justifications: { ...state.justifications, secondary_sources: newSources } };
    }
    case 'ADD_SECONDARY_SOURCE': {
        const newId = `s_${Date.now()}`;
        const newSources = [...state.justifications.secondary_sources, {id: newId, scholar: '', source_detail: '', quote_verbatim: '', scholarNeedsRevision: false, sourceDetailNeedsRevision: false, quoteVerbatimNeedsRevision: false}];
        return { ...state, justifications: { ...state.justifications, secondary_sources: newSources } };
    }
    case 'DELETE_SECONDARY_SOURCE': {
        const sourceToDelete = state.justifications.secondary_sources[action.payload.index];
        const newSources = state.justifications.secondary_sources.filter((_, i) => i !== action.payload.index);
        // Remove the deleted justification ID from all verdicts
        const newVerdicts = state.verdicts.map(v => ({
            ...v,
            justificationIds: v.justificationIds?.filter(id => id !== sourceToDelete.id)
        }));
        return { ...state, verdicts: newVerdicts, justifications: { ...state.justifications, secondary_sources: newSources } };
    }

    default:
      return state;
  }
}

function getInitialState(item: AnnotationItem): State {
    const verdictLabelOptions = ["Wajib", "Sunnah", "Haram", "Makruh", "Mubah", "Boleh/Sah", "Tidak Boleh/Tidak Sah"];
    
    const getInitialVerdicts = (): Verdict[] => {
        if (!item.verdicts || item.verdicts.length === 0) {
            return [];
        }
        return (item.verdicts || []).map((v, i) => {
            const isVerdictInLabels = verdictLabelOptions.includes(v.verdict);
            return {
                verdict: isVerdictInLabels ? v.verdict : "",
                context: v.context,
                is_primary_verdict: v.is_primary_verdict ?? i === 0,
                verdictNeedsRevision: false, 
                contextNeedsRevision: false,
                justificationIds: [], // Start with no links
            };
        });
    };

    const getInitialJustifications = (): Justification => {
        return {
            primary_sources: (item.justifications?.primary_sources || []).map((s, i) => ({ ...s, id: `p_${i}`, textTranslationNeedsRevision: false, referenceNeedsRevision: false })),
            secondary_sources: (item.justifications?.secondary_sources || []).map((s, i) => ({ ...s, id: `s_${i}`, scholarNeedsRevision: false, sourceDetailNeedsRevision: false, quoteVerbatimNeedsRevision: false })),
        };
    };

    return {
        status: 'draft',
        isFatwa: null,
        nonFatwaReason: '',
        question: item.question,
        isQuestionAnswerable: null,
        questionNeedsRevision: false,
        questionRevisionReason: null,
        otherRevisionReason: '',
        verdicts: getInitialVerdicts(),
        justifications: getInitialJustifications(),
    };
}


export function AnnotationInterface({ item }: { item: AnnotationItem }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  const annotationRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const collectionName = item.dataset === 'pilot' ? 'pilotAnnotations' : 'annotations';
    return doc(firestore, collectionName, `${item.originalId}_${user.id}`);
  }, [firestore, item.originalId, user, item.dataset]);

  const { data: existingAnnotation, isLoading: isLoadingAnnotation } = useDoc<Annotation>(annotationRef);
  
  const [formState, dispatch] = useReducer(annotationReducer, getInitialState(item));

  // Data fetching for progress and navigation is now in the header
  const mainAssignmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || item.dataset !== 'main') return null;
    return query(collection(firestore, `itemAssignments`), where('userId', '==', user.id), where('dataset', '==', 'main'));
  }, [firestore, user, item.dataset]);
  const { data: mainAssignments } = useCollection<ItemAssignment>(mainAssignmentsQuery);

  const pilotItemsQuery = useMemoFirebase(() => {
      if (!firestore || item.dataset !== 'pilot') return null;
      return query(collection(firestore, 'annotationItems'), where('dataset', '==', 'pilot'));
  }, [firestore, item.dataset]);
  const { data: pilotItems } = useCollection<AnnotationItem>(pilotItemsQuery);

  const pilotAssignmentsQuery = useMemoFirebase(() => {
      if (!firestore || !user || item.dataset !== 'pilot') return null;
      return query(
          collection(firestore, `itemAssignments`),
          where('userId', '==', user.id),
          where('dataset', '==', 'pilot')
      );
  }, [firestore, user, item.dataset]);
  const { data: pilotAssignments } = useCollection<ItemAssignment>(pilotAssignmentsQuery);

  const isLastItemInQueue = useMemo(() => {
      if(item.dataset === 'main') {
          if (!mainAssignments) return false;
          const pendingOrDraft = mainAssignments.filter(a => a.status === 'pending' || a.status === 'draft');
          return pendingOrDraft.length <= 1 && pendingOrDraft.some(a => a.originalId === item.originalId);
      }
      if(item.dataset === 'pilot') {
          if (!pilotItems || !pilotAssignments) return false;
          const completedIds = new Set(pilotAssignments.filter(a => a.status === 'completed' || a.status === 'non-fatwa').map(a => a.originalId));
          const remainingItems = pilotItems.filter(i => !completedIds.has(i.originalId));
          return remainingItems.length <= 1 && remainingItems.some(i => i.originalId === item.originalId);
      }
      return false;
  }, [mainAssignments, pilotItems, pilotAssignments, item.originalId, item.dataset]);

  useEffect(() => {
    if (existingAnnotation) {
        const initialStateForDefaults = getInitialState(item);
        const justificationsWithIds = {
            primary_sources: (existingAnnotation.justifications?.primary_sources || []).map((s, i) => ({ ...s, id: s.id || `p_${i}` })),
            secondary_sources: (existingAnnotation.justifications?.secondary_sources || []).map((s, i) => ({ ...s, id: s.id || `s_${i}` })),
        };
        
        const payload: State = {
            ...initialStateForDefaults, 
            ...existingAnnotation, 
            justifications: justificationsWithIds,
            verdicts: (existingAnnotation.verdicts || []).map(v => ({...v, justificationIds: v.justificationIds || []}))
        };
        dispatch({ type: 'SET_ENTIRE_STATE', payload });
    } else {
        const initialState = getInitialState(item);
        dispatch({ type: 'SET_ENTIRE_STATE', payload: initialState });
    }
  }, [existingAnnotation, item]); 

  useEffect(() => {
    // Reset and start timer only for pilot items
    if (item.dataset === 'pilot') {
      setStartTime(Date.now());
    } else {
      setStartTime(null);
    }
  }, [item.dataset, item.originalId]); // Reset timer if item changes


  const handleTextSelect = useCallback((text: string) => {
    if (!activeFieldId) return;

    const [field, indexStr, subField] = activeFieldId.split('.');
    const index = parseInt(indexStr);

    if (field === 'verdicts' && subField === 'context') {
        dispatch({ type: 'UPDATE_VERDICT', payload: { index, verdict: { context: text } } });
    } else if (field === 'primary_sources') {
        dispatch({ type: 'UPDATE_PRIMARY_SOURCE', payload: { index, source: { [subField]: text } } });
    } else if (field === 'secondary_sources') {
        dispatch({ type: 'UPDATE_SECONDARY_SOURCE', payload: { index, source: { [subField]: text } } });
    }

    toast({ title: "Teks Disalin", description: "Teks verbatim telah diperbarui." });
  }, [activeFieldId, toast]);

  const validateForm = (isSubmitting: boolean): boolean => {
    if (formState.isFatwa === null) {
      if (isSubmitting) toast({ variant: "destructive", title: "Validasi Gagal", description: "Anda harus menentukan apakah artikel ini fatwa atau bukan (Langkah 1)." });
      return false;
    }

    if (formState.isFatwa === false) {
      return true;
    }

    if (formState.isQuestionAnswerable === null) {
      if (isSubmitting) toast({ variant: "destructive", title: "Validasi Gagal", description: "Anda harus menentukan apakah pertanyaan dapat dijawab (Langkah 2)." });
      return false;
    }
    if (formState.questionNeedsRevision) {
      if (!formState.questionRevisionReason) {
        if (isSubmitting) toast({ variant: "destructive", title: "Validasi Gagal", description: "Pilih alasan revisi pertanyaan (Langkah 2)." });
        return false;
      }
      if (formState.questionRevisionReason === 'other' && !formState.otherRevisionReason.trim()) {
          if (isSubmitting) toast({ variant: "destructive", title: "Validasi Gagal", description: "Isi alasan revisi lainnya (Langkah 2)." });
          return false;
      }
      if (!formState.question.trim()) {
        if (isSubmitting) toast({ variant: "destructive", title: "Validasi Gagal", description: "Pertanyaan yang direvisi tidak boleh kosong (Langkah 2)." });
        return false;
      }
    }

    if (formState.verdicts.length === 0) {
      if (isSubmitting) toast({ variant: "destructive", title: "Validasi Gagal", description: "Harus ada minimal satu verdict (Langkah 3)." });
      return false;
    }
    for (let i = 0; i < formState.verdicts.length; i++) {
      const verdict = formState.verdicts[i];
      if (!verdict.verdict) {
          if (isSubmitting) toast({ variant: "destructive", title: "Validasi Gagal", description: `Label Hukum untuk Verdict #${i + 1} tidak boleh kosong.` });
          return false;
      }
      if (!verdict.context.trim()) {
        if (isSubmitting) toast({ variant: "destructive", title: "Validasi Gagal", description: `Jawaban (Verbatim) untuk Verdict #${i + 1} tidak boleh kosong.` });
        return false;
      }
    }

    for (let i = 0; i < formState.justifications.primary_sources.length; i++) {
      const source = formState.justifications.primary_sources[i];
      if (!source.text_translation.trim() || !source.reference.trim()) {
        if (isSubmitting) toast({ variant: "destructive", title: "Validasi Gagal", description: `Semua field untuk Sumber Primer #${i + 1} harus diisi.` });
        return false;
      }
    }
    for (let i = 0; i < formState.justifications.secondary_sources.length; i++) {
      const source = formState.justifications.secondary_sources[i];
      if (!source.scholar.trim() || !source.source_detail.trim() || !source.quote_verbatim.trim()) {
        if (isSubmitting) toast({ variant: "destructive", title: "Validasi Gagal", description: `Semua field untuk Sumber Sekunder #${i + 1} harus diisi.` });
        return false;
      }
    }
    
    return true;
  };

  const saveAnnotation = (status: 'draft' | 'completed' | 'non-fatwa'): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!firestore || !user || !annotationRef) {
            return reject(new Error("Layanan Firebase tidak tersedia."));
        }
        
        let durationSeconds: number | undefined = undefined;
        if (item.dataset === 'pilot' && status !== 'draft' && startTime) {
          durationSeconds = Math.round((Date.now() - startTime) / 1000);
        }
        
        const draftData: Omit<Annotation, 'id'> = {
            ...formState,
            durationSeconds,
            annotationItemId: item.originalId, 
            userId: user.id,
            status: status,
            createdAt: existingAnnotation?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        try {
            const batch = writeBatch(firestore);
        
            batch.set(annotationRef, draftData, { merge: true });

            if ((status === 'completed' || status === 'non-fatwa') && item.dataset === 'main') {
                const finalCollectionName = item.assignmentType === 'overlap' ? 'overlapAnnotations' : 'completedAnnotations';
                const finalDocRef = doc(firestore, finalCollectionName, `${item.originalId}_${user.id}`);
                const finalData = { ...draftData, status };
                batch.set(finalDocRef, finalData);
            }
            
            const assignmentQuery = query(
                collection(firestore, `itemAssignments`),
                where('originalId', '==', item.originalId),
                where('userId', '==', user.id),
                limit(1)
            );
            const assignmentSnapshot = await getDocs(assignmentQuery);

            if (!assignmentSnapshot.empty) {
                const assignmentDocRef = assignmentSnapshot.docs[0].ref;
                batch.update(assignmentDocRef, { status: status });
            } else if (item.dataset === 'pilot' && status !== 'draft') {
                const newAssignmentRef = doc(collection(firestore, 'itemAssignments'));
                const newAssignment: Omit<ItemAssignment, 'id'> = {
                    annotationItemId: item.id,
                    originalId: item.originalId,
                    userId: user.id,
                    assignedDate: serverTimestamp(),
                    status: status,
                    dataset: 'pilot'
                };
                batch.set(newAssignmentRef, newAssignment);
            }

            batch.commit().then(resolve).catch(error => {
                if (error.code === 'permission-denied') {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: annotationRef.path,
                        operation: 'write',
                        requestResourceData: draftData,
                    }));
                }
                reject(error);
            });
        } catch (e) {
            reject(e);
        }
    });
  }

  const handleAction = async (isDraft: boolean) => {
    const isSubmitting = !isDraft;
    const finalStatus: Annotation['status'] = isDraft 
      ? 'draft' 
      : (formState.isFatwa === false ? 'non-fatwa' : 'completed');

    if (isSubmitting && !validateForm(true)) {
      return; // Stop if validation fails on submit
    }

    saveAnnotation(finalStatus).then(() => {
        toast({
          title: isDraft ? "Draft Disimpan" : "Anotasi Dikirim",
          description: `Pekerjaan Anda untuk item ${item.originalId} telah disimpan.`,
        });

        if (isDraft || isLastItemInQueue) {
          router.push('/annotator/dashboard');
          return;
        }
        
        let nextItemOriginalId: string | null = null;
        if (item.dataset === 'main') {
            if (mainAssignments) {
                const sortedAssignments = [...mainAssignments].sort((a, b) => 
                    a.originalId.localeCompare(b.originalId, undefined, { numeric: true })
                );
                const nextAssignment = sortedAssignments
                    .filter(a => a.status === 'pending' || a.status === 'draft')
                    .find(a => a.originalId !== item.originalId);
                if (nextAssignment) {
                    nextItemOriginalId = nextAssignment.originalId;
                }
            }
        } else if (item.dataset === 'pilot') {
            if (pilotItems && pilotAssignments) {
                const completedIds = new Set(pilotAssignments
                    .filter(a => a.status === 'completed' || a.status === 'non-fatwa')
                    .map(a => a.originalId));
                
                completedIds.add(item.originalId);
                
                const sortedPilotItems = [...pilotItems].sort((a, b) =>
                    a.originalId.localeCompare(b.originalId, undefined, { numeric: true })
                );

                const nextPilotItem = sortedPilotItems.find(i => !completedIds.has(i.originalId));
                if (nextPilotItem) {
                    nextItemOriginalId = nextPilotItem.originalId;
                }
            }
        }

        if (nextItemOriginalId) {
          router.push(`/annotator/annotate/${nextItemOriginalId}`);
        } else {
          router.push('/annotator/dashboard');
        }
    }).catch((error: any) => {
        toast({
          title: "Gagal Menyimpan",
          description: error.message || "Tidak dapat menyimpan pekerjaan Anda.",
          variant: "destructive",
        });
    });
  };


  if (isLoadingAnnotation) {
    return <div className="flex h-full w-full items-center justify-center"><p>Memuat anotasi sebelumnya...</p></div>
  }

  return (
    <div className="h-full flex flex-col">
       <AnnotationTaskHeader 
          item={item}
          startTime={startTime}
       />
      <div className="flex-grow grid grid-rows-[40vh_1fr] md:grid-rows-1 md:grid-cols-2 min-h-0">
        {/* Article Viewer */}
        <div className="md:h-full flex flex-col overflow-y-auto min-h-0">
          <ArticleViewer
              content={item.content}
              onTextSelect={handleTextSelect}
              activeFieldId={activeFieldId}
          />
        </div>
        
        {/* Annotation Form */}
        <div className="md:h-full flex-1 flex flex-col bg-background min-h-0">
            <div className="flex-grow overflow-y-auto min-h-0">
                <AnnotationForm 
                    originalQuestion={item.question}
                    formState={formState}
                    dispatch={dispatch}
                    activeFieldId={activeFieldId}
                    setActiveFieldId={setActiveFieldId}
                />
            </div>
            <div className="p-4 border-t bg-background flex flex-row gap-2 sticky bottom-0">
                <Button variant="outline" onClick={() => handleAction(true)} className="flex-1">
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Draft
                </Button>
                
                <Button onClick={() => handleAction(false)} className="bg-primary hover:bg-primary/90 flex-1">
                    {isLastItemInQueue ? "Submit & Selesai" : "Submit & Lanjutkan"}
                    {!isLastItemInQueue && <ChevronRight className="ml-2 h-4 w-4" />}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
