
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "../ui/separator";

const exportFields = {
    item: [
        { id: 'itemId', label: 'Item ID (Original)' },
        { id: 'url', label: 'URL' },
        { id: 'content', label: 'Content' }
    ],
    annotation: [
        { id: 'annotatorId', label: 'Annotator ID' },
        { id: 'isFatwa', label: 'Is Fatwa?' },
        { id: 'nonFatwaReason', label: 'Non-Fatwa Reason' },
        { id: 'question', label: 'Revised Question' },
        { id: 'verdicts', label: 'Verdicts' },
        { id: 'justifications', label: 'Justifications' },
    ]
};

type FormValues = {
  forML: boolean;
  [key: string]: boolean;
};

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: { selectedFields: Record<string, boolean>, forML: boolean }) => Promise<void>;
};

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
}: ExportDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues = [...exportFields.item, ...exportFields.annotation].reduce((acc, field) => {
    acc[field.id] = true; // Default all to true
    return acc;
  }, {} as Record<string, boolean>);
  
  defaultValues['forML'] = false;

  const form = useForm<FormValues>({
    defaultValues: defaultValues,
  });

  const forMLValue = form.watch('forML');

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    await onExport({ selectedFields: values, forML: values.forML });
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Completed Annotations</DialogTitle>
          <DialogDescription>
            Pilih format ekspor dan bidang yang ingin Anda sertakan.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                
                <FormField
                    control={form.control}
                    name="forML"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-secondary/50">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel className="font-semibold">
                                    Export clean data for ML training (.jsonl)
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">
                                    Menghasilkan data bersih yang siap pakai di mana revisi anotasi telah diterapkan.
                                </p>
                            </div>
                        </FormItem>
                    )}
                />

                <div className={`space-y-4 transition-opacity ${forMLValue ? 'opacity-50' : 'opacity-100'}`}>
                    <Separator />
                    <p className="text-sm text-muted-foreground px-1">
                       Opsi di bawah ini hanya berlaku jika tidak mengekspor untuk ML.
                    </p>
                    <div>
                        <h4 className="font-medium text-sm mb-2">Item Fields</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pl-2">
                            {exportFields.item.map((item) => (
                                <FormField
                                    key={item.id}
                                    control={form.control}
                                    name={item.id}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    disabled={forMLValue}
                                                />
                                            </FormControl>
                                            <FormLabel className="font-normal text-sm">{item.label}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-medium text-sm mb-2">Annotation Fields</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pl-2">
                            {exportFields.annotation.map((item) => (
                                <FormField
                                    key={item.id}
                                    control={form.control}
                                    name={item.id}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    disabled={forMLValue}
                                                />
                                            </FormControl>
                                            <FormLabel className="font-normal text-sm">{item.label}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Mengekspor..." : "Export to JSON"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
