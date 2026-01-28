
"use client";

import { PageHeader } from "@/components/common/page-header";
import { AnnotatorsView } from "@/components/admin/annotators-view";
import type { User as AppUser } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";

export default function AdminAnnotatorsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleAddUser = async (values: any) => {
    if (!firestore) {
      toast({
          variant: "destructive",
          title: "Error",
          description: "Firebase services not available.",
      });
      return;
    }
    try {
        // Check if user already exists
        const usersRef = collection(firestore, "users");
        const q = query(usersRef, where("username", "==", values.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            throw new Error("A user with this email already exists.");
        }

        // Create user document directly in Firestore
        const newUser: Omit<AppUser, 'id'> = {
            name: values.name,
            username: values.email,
            password: values.password, // INSECURE
            role: values.role,
            avatarUrl: `https://i.pravatar.cc/150?u=${Math.random()}`
        };

        await addDoc(usersRef, newUser);

        toast({
            title: "User Created",
            description: `${values.name} has been added as an ${values.role}.`,
        });

    } catch (error: any) {
        console.error("Error creating user:", error);
        toast({
            variant: "destructive",
            title: "Error creating user",
            description: error.message || "An unknown error occurred.",
        });
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <PageHeader
        title="Annotators"
        description="Add, view, and manage annotator accounts."
      />
      <AnnotatorsView 
        onAddUser={handleAddUser}
      />
    </div>
  );
}

    