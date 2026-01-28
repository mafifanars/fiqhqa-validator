
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, UserMinus } from "lucide-react";
import type { User as AppUser, AssignmentFormValues } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "../ui/textarea";

const formSchema = z.object({
  annotatorId: z.string().nonempty("Silakan pilih seorang annotator."),
  assignmentType: z.enum(["range", "list"]),
  startIdNumber: z.string().optional(),
  endIdNumber: z.string().optional(),
  idList: z.string().optional(),
}).refine(data => {
    if (data.assignmentType === 'range') {
        return !!data.startIdNumber;
    }
    return true;
}, {
    message: "Start ID harus diisi untuk penugasan rentang.",
    path: ["startIdNumber"],
}).refine(data => {
    if (data.assignmentType === 'list') {
        return !!data.idList;
    }
    return true;
}, {
    message: "Daftar ID tidak boleh kosong.",
    path: ["idList"],
});

type FormSchemaType = z.infer<typeof formSchema>;


type TaskAssignmentCardProps = {
    annotators: AppUser[];
    isLoadingAnnotators: boolean;
    onAssignTasks: (values: AssignmentFormValues) => void;
    onUnassignTasks: (values: AssignmentFormValues) => void;
}

export function TaskAssignmentCard({ annotators, isLoadingAnnotators, onAssignTasks, onUnassignTasks }: TaskAssignmentCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [action, setAction] = useState<'assign' | 'unassign'>('assign');

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        annotatorId: "",
        assignmentType: "range",
        startIdNumber: "",
        endIdNumber: "",
        idList: "",
    },
  });
  
  const onSubmit = (values: FormSchemaType) => {
    setIsSubmitting(true);
    
    const processedValues: AssignmentFormValues = {
        annotatorId: values.annotatorId,
        assignmentType: values.assignmentType,
        startId: values.startIdNumber ? `fiqih${values.startIdNumber}` : undefined,
        endId: values.endIdNumber ? `fiqih${values.endIdNumber}` : undefined,
        idList: values.idList,
    };

    if (action === 'assign') {
        onAssignTasks(processedValues);
    } else {
        onUnassignTasks(processedValues);
    }
    setIsSubmitting(false); // Reset submission state after the action is dispatched
    form.reset({
        annotatorId: values.annotatorId,
        assignmentType: values.assignmentType,
        startIdNumber: "",
        endIdNumber: "",
        idList: "",
    });
  };

  const assignmentType = form.watch("assignmentType");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign or Unassign Tasks</CardTitle>
        <CardDescription>
          Pilih metode penugasan: berdasarkan rentang ID atau daftar ID.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="annotatorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annotator</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting || isLoadingAnnotators}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingAnnotators ? "Memuat..." : "Pilih seorang annotator"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {annotators?.map((annotator) => (
                        <SelectItem key={annotator.id} value={annotator.id}>
                          {annotator.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignmentType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Metode Penugasan</FormLabel>
                  <FormControl>
                    <Tabs
                      value={field.value}
                      onValueChange={field.onChange}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="range">Rentang ID</TabsTrigger>
                        <TabsTrigger value="list">Daftar ID</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {assignmentType === 'range' && (
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="startIdNumber"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Start ID</FormLabel>
                            <div className="flex items-center">
                                <span className="inline-flex items-center px-3 text-sm text-muted-foreground border border-r-0 rounded-l-md h-10 bg-secondary">fiqih</span>
                                <FormControl>
                                    <Input placeholder="0001" {...field} value={field.value ?? ''} disabled={isSubmitting} className="rounded-l-none" />
                                </FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="endIdNumber"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>End ID (Opsional)</FormLabel>
                             <div className="flex items-center">
                                <span className="inline-flex items-center px-3 text-sm text-muted-foreground border border-r-0 rounded-l-md h-10 bg-secondary">fiqih</span>
                                <FormControl>
                                <Input placeholder="0100" {...field} value={field.value ?? ''} disabled={isSubmitting} className="rounded-l-none" />
                                </FormControl>
                            </div>
                            <FormDescription className="text-xs">Kosongkan jika hanya satu item.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            )}

            {assignmentType === 'list' && (
                 <FormField
                    control={form.control}
                    name="idList"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Daftar Nomor ID</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tempel daftar nomor ID di sini (misal: 0001, 0002). Pisahkan dengan koma, spasi, atau baris baru." 
                            {...field}
                            value={field.value ?? ''}
                            disabled={isSubmitting} 
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Prefix "fiqih" akan ditambahkan secara otomatis.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}

            <div className="flex gap-2">
                <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingAnnotators} onClick={() => setAction('assign')}>
                {isSubmitting && action === 'assign' ? "Memberikan..." : <><UserPlus className="mr-2 h-4 w-4" />Assign Tasks</>}
                </Button>
                <Button type="submit" variant="destructive" className="w-full" disabled={isSubmitting || isLoadingAnnotators} onClick={() => setAction('unassign')}>
                {isSubmitting && action === 'unassign' ? "Membatalkan..." : <><UserMinus className="mr-2 h-4 w-4" />Unassign Tasks</>}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
