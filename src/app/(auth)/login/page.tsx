
"use client";

import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AddUserDialog } from "@/components/admin/add-annotator-dialog";
import { useFirestore, useMemoFirebase, FirestorePermissionError, errorEmitter } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, query, limit, addDoc, where } from "firebase/firestore";
import type { User as AppUser } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";


function LoginPageContent() {
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
    const [initialRole, setInitialRole] = useState<'admin' | 'annotator'>('annotator');
    const [userExists, setUserExists] = useState(true); // Default to true to be safe
    const [isChecking, setIsChecking] = useState(true);
    
    const firestore = useFirestore();
    const { toast } = useToast();

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "users"), limit(1));
    }, [firestore]);


    useEffect(() => {
        if (!firestore) {
            setIsChecking(true);
            return;
        };
        
        setIsChecking(true);
        if (usersQuery) {
            getDocs(usersQuery).then(snapshot => {
                setUserExists(!snapshot.empty);
                setIsChecking(false);
            }).catch(error => {
                console.error("Error checking for users:", error);
                setUserExists(false); // Fallback to allowing admin creation
                setIsChecking(false);
            });
        }
    }, [firestore, usersQuery]);

    const openAddUserDialog = (role: 'admin' | 'annotator') => {
        setInitialRole(role);
        setIsAddUserDialogOpen(true);
    }


    const handleAddUser = async (values: any) => {
        if (!firestore) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Layanan Firebase tidak tersedia.",
            });
            return;
        }

        try {
            const usersRef = collection(firestore, "users");
            const q = query(usersRef, where("username", "==", values.email));
            const querySnapshot = await getDocs(q);
    
            if (!querySnapshot.empty) {
                throw new Error("Pengguna dengan email ini sudah ada.");
            }
    
            const newUser: Omit<AppUser, 'id'> = {
                name: values.name,
                username: values.email,
                password: values.password, // INSECURE
                role: values.role,
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(values.name)}&background=random`
            };
    
            addDoc(usersRef, newUser).then(() => {
                toast({
                    title: "Pengguna Dibuat",
                    description: `${values.name} telah ditambahkan sebagai ${values.role}. Anda sekarang bisa login.`,
                });
                setIsAddUserDialogOpen(false);
                setUserExists(true);
            }).catch((error: any) => {
                if (error.code === 'permission-denied') {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: usersRef.path,
                        operation: 'create',
                        requestResourceData: newUser
                    }));
                } else {
                     toast({
                        variant: "destructive",
                        title: "Gagal membuat pengguna",
                        description: error.message || "Terjadi kesalahan yang tidak diketahui.",
                    });
                }
            });
    
        } catch (error: any) { // Catches the manually thrown "user exists" error
            toast({
                variant: "destructive",
                title: "Gagal membuat pengguna",
                description: error.message,
            });
        }
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 flex justify-center">
                    <Logo className="text-3xl" />
                </div>
                <Card>
                    <CardHeader>
                    <CardTitle className="text-center text-2xl font-headline">
                        Login ke Akun Anda
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <LoginForm />
                    </CardContent>
                </Card>

                <div className="mt-4 text-center h-10 flex items-center justify-center">
                    {isChecking ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Skeleton className="h-4 w-4 rounded-full" />
                           <span>Memeriksa status sistem...</span>
                        </div>
                    ) : !userExists ? (
                        <Button variant="link" onClick={() => openAddUserDialog('admin')}>
                            Buat Akun Admin Awal
                        </Button>
                    ) : null}
                </div>
            </div>
             <AddUserDialog 
                open={isAddUserDialogOpen}
                onOpenChange={setIsAddUserDialogOpen}
                onAddUser={handleAddUser}
                initialRole={initialRole}
             />
        </main>
    );
}

export default function LoginPage() {
  return (
      <LoginPageContent />
  );
}
