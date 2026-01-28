

import { type Timestamp, type FieldValue } from "firebase/firestore";

export type Role = 'admin' | 'annotator';

export type User = {
  id: string;
  name: string;
  username: string; // email
  password?: string; // INSECURE: Only for custom auth.
  role: Role;
  avatarUrl: string;
};

export type Project = {
  id:string;
  name: string;
  createdAt: Timestamp;
  totalEntries: number;
}

export type Verdict = {
  verdict: string; 
  context: string; 
  verdictNeedsRevision: boolean;
  contextNeedsRevision: boolean;
  is_primary_verdict: boolean;
  justificationIds?: string[];
};

export type PrimarySource = {
  id: string; // e.g., 'p_0', 'p_1'
  type: 'Qur’an' | 'Hadits';
  text_translation: string; 
  reference: string; 
  textTranslationNeedsRevision: boolean;
  referenceNeedsRevision: boolean;
};

export type SecondarySource = {
  id: string; // e.g., 's_0', 's_1'
  scholar: string; 
  source_detail: string; 
  quote_verbatim: string; 
  scholarNeedsRevision: boolean;
  sourceDetailNeedsRevision: boolean;
  quoteVerbatimNeedsRevision: boolean;
};

export type Justification = {
  primary_sources: PrimarySource[];
  secondary_sources: SecondarySource[];
};

export type AnnotationStatus = 'draft' | 'completed' | 'non-fatwa';

export type QuestionRevisionReason = 
  | 'syntax' 
  | 'semantic' 
  | 'unanswerable' 
  | 'unfocused' 
  | 'other';

export type Annotation = {
  id: string; // Composite key: ${originalId}_${userId}
  annotationItemId: string; // Now this will be the originalId
  userId: string;
  status: AnnotationStatus;
  isFatwa: boolean;
  nonFatwaReason?: string;
  question: string;
  isQuestionAnswerable: boolean | null; // New field for Q1
  questionNeedsRevision: boolean; // For Q2
  questionRevisionReason: QuestionRevisionReason | null; // New field for Q3
  otherRevisionReason?: string; // New field for Q3 "Lainnya"
  verdicts: Verdict[];
  justifications: Justification;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  durationSeconds?: number; // For pilot test timing
};

// This is the shape of the data read from the JSONL file
export type AnnotationItemFile = {
  id: string;
  url: string;
  madhab: string;
  topic: string;
  question: string;
  verdicts: {
    verdict: string;
    answer: string; // The field is 'answer' in the JSONL
    is_primary_verdict?: boolean;
  }[];
  justifications: {
    primary_sources: Omit<PrimarySource, 'textTranslationNeedsRevision' | 'referenceNeedsRevision' | 'id'>[];
    secondary_sources: Omit<SecondarySource, 'scholarNeedsRevision' | 'sourceDetailNeedsRevision' | 'quoteVerbatimNeedsRevision' | 'id'>[];
  };
  context: string; // The field is 'context' in the JSONL
}

// This is the shape of the document stored in Firestore
export type AnnotationItem = {
  id: string; // Firestore dynamic ID
  originalId: string; // from the file
  url: string;
  madhab: string;
  topic:string;
  question: string;
  verdicts: {
    verdict: string;
    context: string;
    is_primary_verdict?: boolean;
  }[];
  justifications: {
      primary_sources: {
        type: "Qur’an" | "Hadits";
        text_translation: string;
        reference: string;
    }[];
      secondary_sources: {
        scholar: string;
        source_detail: string;
        quote_verbatim: string;
    }[];
  };
  content: string;
  assignedTo: string[]; // Array of user IDs
  status: 'pending' | 'assigned' | 'completed';
  assignmentType?: 'global' | 'overlap';
  dataset: 'main' | 'pilot';
};

export type ItemAssignment = {
    id: string;
    annotationItemId: string; // Firestore dynamic ID
    originalId: string; // The static, original ID from the file
    userId: string;
    assignedDate: Timestamp | Date;
    status: 'pending' | 'draft' | 'completed' | 'non-fatwa';
    dataset: 'main' | 'pilot';
}

export type PilotTestSettings = {
    isActive: boolean;
}

export type AssignmentFormValues = {
    annotatorId: string;
    assignmentType: "range" | "list";
    startId?: string;
    endId?: string;
    idList?: string;
};
