
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";

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
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useFirestore } from "@/firebase";
import type { User as AppUser } from "@/lib/types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Eye, EyeOff } from "lucide-react";


const formSchema = z.object({
  email: z.string().email({
    message: "Silakan masukkan alamat email yang valid.",
  }),
  password: z.string().min(1, { 
    message: "Kata sandi diperlukan.",
  }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    if (!firestore) {
        toast({
            variant: "destructive",
            title: "Login Gagal",
            description: "Firestore tidak diinisialisasi dengan benar.",
        });
        setIsSubmitting(false);
        return;
    }

    try {
        const usersRef = collection(firestore, "users");
        const q = query(usersRef, where("username", "==", values.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("Tidak ada pengguna yang ditemukan dengan email ini.");
        }

        const userDoc = querySnapshot.docs[0];
        const appUser = { id: userDoc.id, ...userDoc.data() } as AppUser;

        // INSECURE: Comparing plaintext passwords.
        if (appUser.password !== values.password) {
            throw new Error("Kata sandi salah.");
        }
        
        localStorage.setItem('user', JSON.stringify(appUser));

        toast({
            title: "Login Berhasil",
            description: `Selamat datang kembali, ${appUser.name}!`,
        });

        if (appUser.role === 'admin') {
            router.push('/admin/dashboard');
        } else {
            router.push('/annotator/dashboard');
        }

    } catch (error: any) {
        console.error("Login failed:", error);
        toast({
            variant: "destructive",
            title: "Login Gagal",
            description: error.message || "Terjadi kesalahan yang tidak terduga.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="admin@qafiqih.com" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
                <div className="relative">
                    <FormControl>
                        <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            {...field} 
                            disabled={isSubmitting}
                        />
                    </FormControl>
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                        >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </Button>
      </form>
    </Form>
  );
}
