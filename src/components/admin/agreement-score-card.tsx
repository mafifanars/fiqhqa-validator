
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { Check, Edit, List, ListChecks, HelpCircle, FileQuestion, Recycle } from "lucide-react";


export type AgreementScores = {
    isFatwa: number | null;
    questionNeedsRevision: number | null;
    verdictCount: number | null;
    justificationCount: number | null;
    isQuestionAnswerable: number | null;
    verdictRevisionCount: number | null;
    justificationRevisionCount: number | null;
} | null;

type AgreementScoreCardProps = {
    scores: AgreementScores;
};

const scoreItems = [
    { key: 'isFatwa', label: 'Kesepakatan "Is Fatwa"', icon: Check },
    { key: 'isQuestionAnswerable', label: 'Kesepakatan "Pertanyaan Dapat Dijawab"', icon: HelpCircle },
    { key: 'questionNeedsRevision', label: 'Kesepakatan "Perlu Revisi Pertanyaan"', icon: FileQuestion },
    { key: 'verdictCount', label: 'Kesepakatan Jumlah Verdict', icon: List },
    { key: 'justificationCount', label: 'Kesepakatan Jumlah Justifikasi', icon: ListChecks },
    { key: 'verdictRevisionCount', label: 'Kesepakatan Revisi Verdict', icon: Edit },
    { key: 'justificationRevisionCount', label: 'Kesepakatan Revisi Justifikasi', icon: Recycle },
];

export function AgreementScoreCard({ scores }: AgreementScoreCardProps) {

    return (
        <>
            {scoreItems.map((item) => {
                const score = scores?.[item.key as keyof typeof scores];
                const Icon = item.icon;
                return (
                    <Card key={item.key}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                            <Icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                 {score === null || score === undefined ? '--' : `${score.toFixed(1)}%`}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </>
    );
}
