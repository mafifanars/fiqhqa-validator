
"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Trash2, Download, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { AnnotationItem, User as AppUser, ItemAssignment } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { Input } from "../ui/input";


type DataViewProps = {
    items: AnnotationItem[];
    assignments: ItemAssignment[];
    users: AppUser[];
    isLoading: boolean;
    selectedItemIds: string[];
    setSelectedItemIds: React.Dispatch<React.SetStateAction<string[]>>;
    onDeleteSelected: () => void;
    onExport: () => void;
    datasetType: 'main' | 'pilot';
    isProcessing: boolean;
}

export function DataView({ items, assignments, users, isLoading, selectedItemIds, setSelectedItemIds, onDeleteSelected, onExport, datasetType, isProcessing }: DataViewProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const itemStatusMap = useMemo(() => {
    const map = new Map<string, { status: string, assignedTo: string[] }>();
    if (!assignments) return map;

    const assignmentsByOriginalId = assignments.reduce((acc, assignment) => {
        if (!acc[assignment.originalId]) acc[assignment.originalId] = [];
        acc[assignment.originalId].push(assignment);
        return acc;
    }, {} as Record<string, ItemAssignment[]>);

    items.forEach(item => {
        const itemAssignments = assignmentsByOriginalId[item.originalId] || [];
        const assignedUserIds = itemAssignments.map(a => a.userId);
        let status = "Pending";

        if (itemAssignments.length > 0) {
            const allCompleted = itemAssignments.every(a => a.status === 'completed' || a.status === 'non-fatwa');
            if (allCompleted) {
                status = "Completed";
            } else {
                status = "Assigned";
            }
        }
        map.set(item.id, { status, assignedTo: assignedUserIds });
    });
    return map;
  }, [items, assignments]);

  const uniqueTopics = useMemo(() => {
    const topics = new Set(items.map(item => item.topic));
    return ["all", ...Array.from(topics)];
  }, [items]);

  const filteredItems = useMemo(() => {
    setCurrentPage(1); // Reset to first page whenever filters change
    return items
      .filter(item => {
        const statusInfo = itemStatusMap.get(item.id);
        const matchesSearch = item.originalId.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTopic = topicFilter === 'all' || item.topic === topicFilter;
        const matchesStatus = statusFilter === 'all' || (statusInfo && statusInfo.status === statusFilter);

        return matchesSearch && matchesTopic && matchesStatus;
    })
    .sort((a, b) => a.originalId.localeCompare(b.originalId, undefined, { numeric: true }));
  }, [items, searchQuery, topicFilter, statusFilter, itemStatusMap]);

  const totalPages = useMemo(() => Math.ceil(filteredItems.length / rowsPerPage), [filteredItems.length, rowsPerPage]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, rowsPerPage]);


  const goToNextPage = () => {
    setCurrentPage((page) => Math.min(page + 1, totalPages));
  };

  const goToPreviousPage = () => {
      setCurrentPage((page) => Math.max(page - 1, 1));
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when rows per page changes
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
        case "Pending":
            return <Badge variant="outline">Pending</Badge>;
        case "Assigned":
            return <Badge variant="secondary">Assigned</Badge>;
        case "Completed":
            return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
        default:
            return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getAssignedAnnotators = (userIds: string[]): AppUser[] => {
    if (!userIds || !users) return [];
    return users.filter(user => userIds.includes(user.id));
  }

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedItemIds(filteredItems.map(item => item.id));
    } else {
      setSelectedItemIds([]);
    }
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    setSelectedItemIds(prev => 
      checked ? [...prev, id] : prev.filter(itemId => itemId !== id)
    );
  };

  const confirmDelete = () => {
    onDeleteSelected();
    setIsDeleteDialogOpen(false);
  }

  const isAllSelected = filteredItems.length > 0 && selectedItemIds.length === filteredItems.length;
  const isIndeterminate = selectedItemIds.length > 0 && !isAllSelected;

  const cardTitle = datasetType === 'main' ? "Item Data Utama" : "Item Data Pilot Test";
  const cardDescription = datasetType === 'main' 
    ? "Lihat semua item, berikan tugas, dan ekspor data anotasi."
    : "Lihat semua item yang ditandai untuk pilot test.";

  const isPilot = datasetType === 'pilot';
  const detailPath = isPilot ? '/admin/pilot-data' : '/admin/main-data';

  return (
    <>
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between">
        <div className="mb-4 md:mb-0">
            <CardTitle>{cardTitle}</CardTitle>
            <CardDescription>{cardDescription}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                variant="outline"
                size="sm"
                onClick={onExport}
                disabled={isLoading || isProcessing}
                className="gap-1"
            >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
            </Button>
            <Button 
                variant="destructive" 
                size="sm" 
                disabled={selectedItemIds.length === 0 || isLoading || isProcessing}
                onClick={() => setIsDeleteDialogOpen(true)}
                className="gap-1"
            >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Hapus ({selectedItemIds.length})</span>
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
                 <Input
                    placeholder="Cari berdasarkan ID (cth: fiqih0001)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:max-w-xs"
                    disabled={isProcessing}
                />
                <div className="flex gap-4">
                    <Select value={topicFilter} onValueChange={setTopicFilter} disabled={isProcessing}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by Topic" />
                        </SelectTrigger>
                        <SelectContent>
                             {uniqueTopics.map(topic => (
                                <SelectItem key={topic} value={topic}>
                                    {topic === 'all' ? 'Semua Topik' : topic}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {!isPilot && (
                        <Select value={statusFilter} onValueChange={setStatusFilter} disabled={isProcessing}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter by Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Assigned">Assigned</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto rounded-md border">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px] px-4">
                            <Checkbox 
                                checked={isAllSelected || isIndeterminate}
                                onCheckedChange={handleSelectAll}
                                aria-label="Pilih semua baris"
                                disabled={isProcessing}
                            />
                        </TableHead>
                        <TableHead>#</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Topik</TableHead>
                        {!isPilot && <TableHead className="hidden md:table-cell">Status</TableHead>}
                        {!isPilot && <TableHead className="hidden md:table-cell">Ditugaskan</TableHead>}
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                            <TableCell colSpan={isPilot ? 5 : 7}>
                                <Skeleton className="h-8 w-full" />
                            </TableCell>
                            </TableRow>
                        ))
                    ) : paginatedItems && paginatedItems.length > 0 ? (
                        paginatedItems.map((item, index) => {
                            const statusInfo = itemStatusMap.get(item.id) || { status: 'Pending', assignedTo: [] };
                            const globalIndex = (currentPage - 1) * rowsPerPage + index + 1;
                            return (
                            <TableRow key={item.id} data-state={selectedItemIds.includes(item.id) ? "selected" : ""}>
                                <TableCell className="px-4">
                                    <Checkbox 
                                        checked={selectedItemIds.includes(item.id)}
                                        onCheckedChange={(checked) => handleRowSelect(item.id, !!checked)}
                                        aria-label={`Pilih baris ${globalIndex}`}
                                        disabled={isProcessing}
                                    />
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{globalIndex}</TableCell>
                                <TableCell className="font-medium text-xs sm:text-sm">{item.originalId}</TableCell>
                                <TableCell className="text-xs sm:text-sm">{item.topic}</TableCell>
                                {!isPilot && <TableCell className="hidden md:table-cell">{getStatusBadge(statusInfo.status)}</TableCell>}
                                {!isPilot && <TableCell className="hidden md:table-cell">
                                    <div className="flex -space-x-2">
                                    {getAssignedAnnotators(statusInfo.assignedTo).map(annotator => (
                                        <Avatar key={annotator.id} className="h-6 w-6 border-2 border-background">
                                            <AvatarImage src={annotator.avatarUrl} />
                                            <AvatarFallback>{getInitials(annotator.name)}</AvatarFallback>
                                        </Avatar>
                                    ))}
                                    </div>
                                </TableCell>}
                                <TableCell className="text-right">
                                    <Button asChild variant="ghost" size="icon">
                                        <Link href={`${detailPath}/${item.originalId}`} target="_blank">
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )})
                    ) : (
                            <TableRow>
                            <TableCell colSpan={isPilot ? 5 : 7} className="text-center h-24">
                                Tidak ada item yang cocok dengan filter Anda.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </div>
             <div className="flex items-center justify-between space-x-4 py-4 text-sm">
                <div className="text-muted-foreground">
                    {selectedItemIds.length} dari {filteredItems.length} baris terpilih.
                </div>
                <div className="flex items-center gap-4">
                    {items.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Rows per page:</span>
                            <Select
                                value={`${rowsPerPage}`}
                                onValueChange={handleRowsPerPageChange}
                            >
                                <SelectTrigger className="h-8 w-[70px]">
                                    <SelectValue placeholder={rowsPerPage} />
                                </SelectTrigger>
                                <SelectContent>
                                    {[5, 10, 20, 50, 100].map(pageSize => (
                                        <SelectItem key={pageSize} value={`${pageSize}`}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                                Halaman {currentPage} dari {totalPages}
                            </span>
                            <div className="space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={goToPreviousPage}
                                    disabled={currentPage === 1 || isProcessing}
                                >
                                    Sebelumnya
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={goToNextPage}
                                    disabled={currentPage === totalPages || isProcessing}
                                >
                                    Berikutnya
                                </Button>
                            </div>
                        </div>
                    )}
                 </div>
            </div>
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
                Tindakan ini akan menghapus {selectedItemIds.length} item data secara permanen. Semua anotasi dan penugasan terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                Ya, Hapus
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    