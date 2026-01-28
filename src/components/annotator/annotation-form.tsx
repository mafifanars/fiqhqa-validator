

"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { Annotation, QuestionRevisionReason } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle, Trash2, XIcon, Star, Link2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Lightbulb } from "lucide-react";
import { Input } from "../ui/input";
import React from "react";
import { MultiSelect } from "../ui/multi-select";
import { cn } from "@/lib/utils";

type AnnotationFormProps = {
  originalQuestion: string;
  formState: Omit<Annotation, 'itemId' | 'annotatorId' | 'createdAt' | 'updatedAt' | 'status'>;
  dispatch: React.Dispatch<any>;
  activeFieldId: string | null;
  setActiveFieldId: (id: string | null) => void;
};

const revisionReasons: { value: QuestionRevisionReason, label: string }[] = [
    { value: 'syntax', label: 'Masalah sintaksis / tata bahasa' },
    { value: 'semantic', label: 'Masalah semantik (makna tidak jelas / ambigu)' },
    { value: 'unanswerable', label: 'Tidak dapat dijawab oleh artikel' },
    { value: 'unfocused', label: 'Pertanyaan tidak fokus / terlalu umum' },
    { value: 'other', label: 'Lainnya (opsional)' },
];

export function AnnotationForm({ originalQuestion, formState, dispatch, activeFieldId, setActiveFieldId }: AnnotationFormProps) {
    const verdictLabelOptions = ["Wajib", "Sunnah", "Haram", "Makruh", "Mubah", "Boleh/Sah", "Tidak Boleh/Tidak Sah"];
    
    const allJustifications = [
      ...formState.justifications.primary_sources.map((s, i) => ({
        value: s.id,
        label: `Primer #${i + 1}: ${s.reference || "Referensi kosong"}`,
      })),
      ...formState.justifications.secondary_sources.map((s, i) => ({
        value: s.id,
        label: `Sekunder #${i + 1}: ${s.scholar || "Ulama kosong"}`,
      })),
    ];
  
    const VerbatimTextarea = ({
        fieldId,
        isDisabled,
        value,
        onChange,
        ...props
    }: React.ComponentProps<typeof Textarea> & { fieldId: string, isDisabled: boolean }) => {
        const isActive = activeFieldId === fieldId && !isDisabled;

        const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            if (onChange) {
                // Simulate an event with an empty value
                const syntheticEvent = {
                    target: { value: '' }
                } as React.ChangeEvent<HTMLTextAreaElement>;
                onChange(syntheticEvent);
            }
        };

        return (
            <div className="relative">
                <Textarea
                    onFocus={() => !isDisabled && setActiveFieldId(fieldId)}
                    className={cn(
                        "relative rounded-md transition-all disabled:opacity-70 disabled:cursor-not-allowed",
                        isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
                        value ? "pr-8" : "", // Add padding if there is text for the button
                        props.className
                    )}
                    disabled={isDisabled}
                    value={value}
                    onChange={onChange}
                    {...props}
                />
                 {value && !isDisabled && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-1 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={handleClear}
                    >
                        <XIcon className="h-4 w-4" />
                        <span className="sr-only">Bersihkan</span>
                    </Button>
                )}
            </div>
        );
    };

    return (
    <div className="p-4 space-y-4">
      
      <Accordion type="multiple" defaultValue={['item-1', 'item-2', 'item-3', 'item-4']} className="w-full space-y-2">
        <AccordionItem value="item-1" className="bg-card border rounded-lg">
          <AccordionTrigger className="p-4">Langkah 1: Penyaringan</AccordionTrigger>
          <AccordionContent className="space-y-4 p-4 border-t">
            <Label>Apakah artikel ini merupakan fatwa atau pembahasan fikih?</Label>
            <RadioGroup
              value={formState.isFatwa === null ? '' : formState.isFatwa ? 'yes' : 'no'}
              onValueChange={(value) => dispatch({type: 'UPDATE_FIELD', payload: {field: 'isFatwa', value: value === 'yes'}})}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="r1" />
                <Label htmlFor="r1">Ya, ini fatwa/fikih.</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="r2" />
                <Label htmlFor="r2">Tidak, ini bukan fatwa/fikih.</Label>
              </div>
            </RadioGroup>
            {formState.isFatwa === false && (
              <Textarea
                placeholder="Alasan (opsional, misalnya: Artikel hanya berupa kisah, tidak ada penetapan hukum)"
                value={formState.nonFatwaReason}
                onChange={(e) => dispatch({type: 'UPDATE_FIELD', payload: {field: 'nonFatwaReason', value: e.target.value}})}
              />
            )}
          </AccordionContent>
        </AccordionItem>

        {formState.isFatwa && (
          <>
            <AccordionItem value="item-2" className="bg-card border rounded-lg">
              <AccordionTrigger className="p-4">Langkah 2: Pertanyaan</AccordionTrigger>
              <AccordionContent className="space-y-6 p-4 border-t">
                 <div className="space-y-3">
                  <Label>Pertanyaan Asli</Label>
                  <div className="prose prose-sm max-w-none p-3 rounded-md border bg-muted text-muted-foreground">
                    <p>{originalQuestion}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                    <Label>Apakah pertanyaan ini dapat dijawab oleh artikel di atas?</Label>
                    <RadioGroup
                        value={formState.isQuestionAnswerable === null ? '' : formState.isQuestionAnswerable ? 'yes' : 'no'}
                        onValueChange={(value) => dispatch({type: 'UPDATE_FIELD', payload: {field: 'isQuestionAnswerable', value: value === 'yes'}})}
                        className="flex gap-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="q1-yes" />
                            <Label htmlFor="q1-yes" className="font-normal">Ya</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="q1-no" />
                            <Label htmlFor="q1-no" className="font-normal">Tidak</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="space-y-2">
                    <Label>Apakah pertanyaan ini perlu diperbaiki?</Label>
                    <RadioGroup
                        value={formState.questionNeedsRevision ? 'yes' : 'no'}
                        onValueChange={(value) => dispatch({type: 'UPDATE_FIELD', payload: {field: 'questionNeedsRevision', value: value === 'yes'}})}
                        className="flex gap-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="q2-no" />
                            <Label htmlFor="q2-no" className="font-normal">Tidak</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="q2-yes" />
                            <Label htmlFor="q2-yes" className="font-normal">Ya</Label>
                        </div>
                    </RadioGroup>
                </div>
                
                {formState.questionNeedsRevision && (
                    <div className="space-y-4 border-l-2 border-primary pl-4 ml-1">
                        <div className="space-y-2">
                            <Label>Alasan utama pertanyaan perlu diperbaiki</Label>
                            <Select
                                value={formState.questionRevisionReason || ''}
                                onValueChange={(value: QuestionRevisionReason) => dispatch({type: 'UPDATE_FIELD', payload: {field: 'questionRevisionReason', value}})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih alasan..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {revisionReasons.map(reason => (
                                        <SelectItem key={reason.value} value={reason.value}>{reason.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {formState.questionRevisionReason === 'other' && (
                             <div className="space-y-2">
                                <Label>Alasan Lainnya</Label>
                                <Input 
                                    value={formState.otherRevisionReason}
                                    onChange={(e) => dispatch({type: 'UPDATE_FIELD', payload: {field: 'otherRevisionReason', value: e.target.value}})}
                                    placeholder="Jelaskan alasan lainnya..."
                                />
                             </div>
                        )}

                        <div className="space-y-2">
                             <Label>Tulis Ulang Pertanyaan</Label>
                             <Textarea
                                value={formState.question}
                                onChange={(e) => dispatch({type: 'UPDATE_FIELD', payload: {field: 'question', value: e.target.value}})}
                                rows={3}
                                placeholder="Tulis versi pertanyaan yang sudah diperbaiki di sini..."
                            />
                        </div>
                    </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-card border rounded-lg">
              <AccordionTrigger className="p-4">Langkah 3: Putusan (Verdict)</AccordionTrigger>
              <AccordionContent className="space-y-4 p-4 border-t">
                <Alert className="bg-blue-50 border-blue-200">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-700">Diperlukan Teks Asli (Verbatim)</AlertTitle>
                    <AlertDescription className="text-blue-600/80">
                        Klik kolom 'Jawaban' atau 'Verbatim' lainnya, lalu sorot teks yang sesuai dari artikel di sebelah kiri.
                    </AlertDescription>
                </Alert>

                {formState.verdicts.map((verdict, index) => (
                  <Card key={index} className="bg-secondary/40">
                    <CardHeader className="flex flex-row items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">Verdict #{index + 1}</CardTitle>
                            {verdict.is_primary_verdict && <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />}
                        </div>
                        <div className="flex items-center gap-1">
                            <Button 
                                variant={verdict.is_primary_verdict ? "secondary" : "ghost"} 
                                size="sm" 
                                className="h-7"
                                onClick={() => dispatch({type: 'SET_PRIMARY_VERDICT', payload: {index}})}
                                disabled={verdict.is_primary_verdict}
                            >
                                Jadikan Utama
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => dispatch({type: 'DELETE_VERDICT', payload: {index}})}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-3 pt-0">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Apakah label hukum sesuai?</Label>
                        <RadioGroup
                            value={verdict.verdictNeedsRevision ? 'no' : 'yes'}
                            onValueChange={(value) => dispatch({ type: 'UPDATE_VERDICT', payload: { index, verdict: { verdictNeedsRevision: value === 'no' } } })}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`v-l-yes-${index}`} />
                                <Label htmlFor={`v-l-yes-${index}`} className="font-normal">Ya</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`v-l-no-${index}`} />
                                <Label htmlFor={`v-l-no-${index}`} className="font-normal">Tidak, perlu perbaikan</Label>
                            </div>
                        </RadioGroup>
                      </div>
                      <div>
                        <Label className="text-xs">Label Hukum</Label>
                        <Select
                            value={verdict.verdict}
                            onValueChange={(val) => dispatch({ type: 'UPDATE_VERDICT', payload: { index, verdict: { verdict: val } } })}
                            disabled={!verdict.verdictNeedsRevision}
                        >
                            <SelectTrigger className="disabled:opacity-70 disabled:cursor-not-allowed"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {verdictLabelOptions.map(label => <SelectItem key={label} value={label}>{label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Apakah jawaban sesuai?</Label>
                         <RadioGroup
                            value={verdict.contextNeedsRevision ? 'no' : 'yes'}
                            onValueChange={(value) => dispatch({ type: 'UPDATE_VERDICT', payload: { index, verdict: { contextNeedsRevision: value === 'no' } } })}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`v-c-yes-${index}`} />
                                <Label htmlFor={`v-c-yes-${index}`} className="font-normal">Ya</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`v-c-no-${index}`} />
                                <Label htmlFor={`v-c-no-${index}`} className="font-normal">Tidak, perlu perbaikan</Label>
                            </div>
                        </RadioGroup>
                      </div>

                      <div>
                        <Label className="text-xs">Jawaban (Verbatim)</Label>
                        <VerbatimTextarea 
                            fieldId={`verdicts.${index}.context`}
                            isDisabled={!verdict.contextNeedsRevision}
                            value={verdict.context}
                            onChange={(e) => dispatch({ type: 'UPDATE_VERDICT', payload: { index, verdict: { context: e.target.value } } })}
                            rows={3}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold flex items-center gap-2"><Link2 className="h-3 w-3" />Tautkan Justifikasi</Label>
                        <MultiSelect
                            options={allJustifications}
                            selected={verdict.justificationIds || []}
                            onChange={(selectedIds) => dispatch({type: 'UPDATE_VERDICT', payload: {index, verdict: {justificationIds: selectedIds}}})}
                            placeholder="Pilih justifikasi..."
                            className="w-full"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" size="sm" onClick={() => dispatch({type: 'ADD_VERDICT'})}><PlusCircle className="mr-2 h-4 w-4"/> Tambah Verdict</Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-card border rounded-lg">
              <AccordionTrigger className="p-4">Langkah 4: Justifikasi</AccordionTrigger>
              <AccordionContent className="space-y-6 p-4 border-t">
                <div>
                    <h4 className="font-semibold mb-2 text-sm">Sumber Primer (Qur'an/Hadits)</h4>
                    {formState.justifications.primary_sources.map((source, index) => (
                        <Card key={source.id} className="mb-4 bg-secondary/40">
                             <CardHeader className="flex flex-row items-center justify-between p-3">
                                <CardTitle className="text-sm font-medium">Sumber Primer #{index + 1}</CardTitle>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => dispatch({type: 'DELETE_PRIMARY_SOURCE', payload: {index}})}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-3 p-3 pt-0">
                                
                                <div>
                                    <Label className="text-xs">Tipe</Label>
                                    <Select
                                        value={source.type}
                                        onValueChange={(val) => dispatch({ type: 'UPDATE_PRIMARY_SOURCE', payload: { index, source: { type: val } } })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Qur’an">Qur’an</SelectItem>
                                            <SelectItem value="Hadits">Hadits</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Apakah terjemahan teks sesuai?</Label>
                                    <RadioGroup
                                        value={source.textTranslationNeedsRevision ? 'no' : 'yes'}
                                        onValueChange={(value) => dispatch({ type: 'UPDATE_PRIMARY_SOURCE', payload: { index, source: { textTranslationNeedsRevision: value === 'no' } } })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`ps-tt-yes-${index}`} />
                                            <Label htmlFor={`ps-tt-yes-${index}`} className="font-normal">Ya</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`ps-tt-no-${index}`} />
                                            <Label htmlFor={`ps-tt-no-${index}`} className="font-normal">Tidak, perlu perbaikan</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div>
                                    <Label className="text-xs">Terjemahan Teks (Verbatim)</Label>
                                    <VerbatimTextarea 
                                        fieldId={`primary_sources.${index}.text_translation`}
                                        isDisabled={!source.textTranslationNeedsRevision}
                                        value={source.text_translation} 
                                        onChange={e => dispatch({type: 'UPDATE_PRIMARY_SOURCE', payload: { index, source: { text_translation: e.target.value } }})} 
                                        rows={3} 
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Apakah referensi sesuai?</Label>
                                    <RadioGroup
                                        value={source.referenceNeedsRevision ? 'no' : 'yes'}
                                        onValueChange={(value) => dispatch({ type: 'UPDATE_PRIMARY_SOURCE', payload: { index, source: { referenceNeedsRevision: value === 'no' } } })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`ps-r-yes-${index}`} />
                                            <Label htmlFor={`ps-r-yes-${index}`} className="font-normal">Ya</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`ps-r-no-${index}`} />
                                            <Label htmlFor={`ps-r-no-${index}`} className="font-normal">Tidak, perlu perbaikan</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div>
                                    <Label className="text-xs">Referensi (Verbatim)</Label>
                                    <VerbatimTextarea 
                                        fieldId={`primary_sources.${index}.reference`}
                                        isDisabled={!source.referenceNeedsRevision}
                                        value={source.reference} 
                                        onChange={e => dispatch({type: 'UPDATE_PRIMARY_SOURCE', payload: { index, source: { reference: e.target.value } }})} 
                                        rows={1} 
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => dispatch({type: 'ADD_PRIMARY_SOURCE'})}><PlusCircle className="mr-2 h-4 w-4"/> Tambah Sumber Primer</Button>
                </div>
                 <div>
                    <h4 className="font-semibold mb-2 text-sm">Sumber Sekunder (Kutipan Ulama)</h4>
                    {formState.justifications.secondary_sources.map((source, index) => (
                        <Card key={source.id} className="mb-4 bg-secondary/40">
                            <CardHeader className="flex flex-row items-center justify-between p-3">
                                <CardTitle className="text-sm font-medium">Sumber Sekunder #{index + 1}</CardTitle>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => dispatch({type: 'DELETE_SECONDARY_SOURCE', payload: {index}})}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                             <CardContent className="space-y-3 p-3 pt-0">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Apakah nama ulama sesuai?</Label>
                                    <RadioGroup
                                        value={source.scholarNeedsRevision ? 'no' : 'yes'}
                                        onValueChange={(value) => dispatch({ type: 'UPDATE_SECONDARY_SOURCE', payload: { index, source: { scholarNeedsRevision: value === 'no' } } })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`ss-s-yes-${index}`} />
                                            <Label htmlFor={`ss-s-yes-${index}`} className="font-normal">Ya</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`ss-s-no-${index}`} />
                                            <Label htmlFor={`ss-s-no-${index}`} className="font-normal">Tidak, perlu perbaikan</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div>
                                    <Label className="text-xs">Ulama (Verbatim)</Label>
                                    <VerbatimTextarea 
                                        fieldId={`secondary_sources.${index}.scholar`}
                                        isDisabled={!source.scholarNeedsRevision}
                                        value={source.scholar} 
                                        onChange={e => dispatch({type: 'UPDATE_SECONDARY_SOURCE', payload: { index, source: { scholar: e.target.value } }})} 
                                        rows={1}
                                     />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Apakah detail sumber sesuai?</Label>
                                    <RadioGroup
                                        value={source.sourceDetailNeedsRevision ? 'no' : 'yes'}
                                        onValueChange={(value) => dispatch({ type: 'UPDATE_SECONDARY_SOURCE', payload: { index, source: { sourceDetailNeedsRevision: value === 'no' } } })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`ss-sd-yes-${index}`} />
                                            <Label htmlFor={`ss-sd-yes-${index}`} className="font-normal">Ya</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`ss-sd-no-${index}`} />
                                            <Label htmlFor={`ss-sd-no-${index}`} className="font-normal">Tidak, perlu perbaikan</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div>
                                    <Label className="text-xs">Detail Sumber (Verbatim)</Label>
                                    <VerbatimTextarea
                                        fieldId={`secondary_sources.${index}.source_detail`}
                                        isDisabled={!source.sourceDetailNeedsRevision}
                                        value={source.source_detail} 
                                        onChange={e => dispatch({type: 'UPDATE_SECONDARY_SOURCE', payload: { index, source: { source_detail: e.target.value } }})} 
                                        rows={1}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Apakah kutipan sesuai?</Label>
                                    <RadioGroup
                                        value={source.quoteVerbatimNeedsRevision ? 'no' : 'yes'}
                                        onValueChange={(value) => dispatch({ type: 'UPDATE_SECONDARY_SOURCE', payload: { index, source: { quoteVerbatimNeedsRevision: value === 'no' } } })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`ss-q-yes-${index}`} />
                                            <Label htmlFor={`ss-q-yes-${index}`} className="font-normal">Ya</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`ss-q-no-${index}`} />
                                            <Label htmlFor={`ss-q-no-${index}`} className="font-normal">Tidak, perlu perbaikan</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div>
                                    <Label className="text-xs">Kutipan (Verbatim)</Label>
                                    <VerbatimTextarea
                                        fieldId={`secondary_sources.${index}.quote_verbatim`}
                                        isDisabled={!source.quoteVerbatimNeedsRevision}
                                        value={source.quote_verbatim} 
                                        onChange={e => dispatch({type: 'UPDATE_SECONDARY_SOURCE', payload: { index, source: { quote_verbatim: e.target.value } }})} 
                                        rows={4}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => dispatch({type: 'ADD_SECONDARY_SOURCE'})}><PlusCircle className="mr-2 h-4 w-4"/> Tambah Sumber Sekunder</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </>
        )}
      </Accordion>
    </div>
  );
}
