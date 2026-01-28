

"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "../ui/button";

export type Disagreement = {
    itemOriginalId: string;
    annotatorPair: string[];
    criteria: string;
    details: { user: string; value: any }[];
};

type DisagreementTableProps = {
    disagreements: Disagreement[];
};

const ValueDisplay = ({ value }: { value: any }) => {
    if (typeof value === 'boolean') {
        return <Badge variant={value ? "default" : "destructive"}>{value ? "Ya" : "Tidak"}</Badge>;
    }
    if (typeof value === 'number') {
        return <Badge variant="secondary">{value}</Badge>;
    }
    return <span className="text-sm">{String(value)}</span>;
};

const ROWS_PER_PAGE = 5;

export function DisagreementTable({ disagreements }: DisagreementTableProps) {
    const [currentPage, setCurrentPage] = useState(1);

    if (!disagreements || disagreements.length === 0) {
        return <p className="text-sm text-muted-foreground">Tidak ada ketidaksepakatan ditemukan.</p>;
    }
    
    const headers = [...new Set(disagreements.flatMap(d => d.details.map(det => det.user)))].sort();
    
    const totalPages = Math.ceil(disagreements.length / ROWS_PER_PAGE);
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const paginatedDisagreements = disagreements.slice(startIndex, startIndex + ROWS_PER_PAGE);

    const goToNextPage = () => {
        setCurrentPage((page) => Math.min(page + 1, totalPages));
    };

    const goToPreviousPage = () => {
        setCurrentPage((page) => Math.max(page - 1, 1));
    };


    return (
        <div>
            <div className="overflow-x-auto rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px] min-w-[120px]">Item ID</TableHead>
                            {headers.map(header => (
                                <TableHead key={header} className="text-center min-w-[150px]">{header}</TableHead>
                            ))}
                            <TableHead className="text-right w-[80px] min-w-[80px]">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedDisagreements.map((disagreement, index) => {
                            const detailsMap = new Map(disagreement.details.map(d => [d.user, d.value]));
                            return (
                                <TableRow key={`${disagreement.itemOriginalId}-${index}`}>
                                    <TableCell className="font-medium text-xs">{disagreement.itemOriginalId}</TableCell>
                                    {headers.map(header => (
                                        <TableCell key={header} className="text-center">
                                            {detailsMap.has(header) ? (
                                                <ValueDisplay value={detailsMap.get(header)} />
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-right">
                                        <Button asChild variant="ghost" size="icon">
                                            <Link href={`/admin/main-data/${disagreement.itemOriginalId}`} target="_blank">
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
             {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                    <span className="text-sm text-muted-foreground">
                        Halaman {currentPage} dari {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                    >
                        Sebelumnya
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                    >
                        Berikutnya
                    </Button>
                </div>
            )}
        </div>
    );
}
