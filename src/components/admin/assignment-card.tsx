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
import type { User as AppUser } from "@/lib/types";


const formSchema = z.object({
  startIndex: z.coerce.number().min(1, "Start index must be at least 1."),
  // Make endIndex optional and allow an empty string.
  endIndex: z.coerce.number().min(1).optional().or(z.literal('')),
  annotatorId: z.string().nonempty("Please select an annotator."),
}).refine(data => {
    // Only validate if endIndex has a value.
    if (data.endIndex) {
        return data.endIndex >= data.startIndex;
    }
    return true;
}, {
  message: "End index must be greater than or equal to start index.",
  path: ["endIndex"],
});

type FormValues = z.infer<typeof formSchema>;

type TaskAssignmentCardProps = {
    annotators: AppUser[];
    isLoadingAnnotators: boolean;
    onAssignTasks: (values: FormValues) => void;
    onUnassignTasks: (values: FormValues) => void;
}

export function TaskAssignmentCard({ annotators, isLoadingAnnotators, onAssignTasks, onUnassignTasks }: TaskAssignmentCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [action, setAction] = useState<'assign' | 'unassign'>('assign');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        startIndex: '' as any, // Use `as any` to satisfy TS with empty string
        endIndex: '' as any,
        annotatorId: "",
    },
  });
  
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    if (action === 'assign') {
        await onAssignTasks(values);
    } else {
        await onUnassignTasks(values);
    }
    setIsSubmitting(false);
    form.reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign or Unassign Tasks</CardTitle>
        <CardDescription>
          Assign/unassign a range of items to an annotator. Leave 'End Index' blank for a single item.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startIndex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Index</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 1" {...field} value={field.value ?? ''} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endIndex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Index</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 10" {...field} value={field.value ?? ''} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                        <SelectValue placeholder={isLoadingAnnotators ? "Loading..." : "Select an annotator"} />
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
            <div className="flex gap-2">
                <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingAnnotators} onClick={() => setAction('assign')}>
                {isSubmitting && action === 'assign' ? "Assigning..." : <><UserPlus className="mr-2 h-4 w-4" />Assign Tasks</>}
                </Button>
                <Button type="submit" variant="destructive" className="w-full" disabled={isSubmitting || isLoadingAnnotators} onClick={() => setAction('unassign')}>
                {isSubmitting && action === 'unassign' ? "Unassigning..." : <><UserMinus className="mr-2 h-4 w-4" />Unassign Tasks</>}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}