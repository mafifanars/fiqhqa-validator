
"use client";

import Link from "next/link";
import {
  Home,
  Users,
  Database,
  PanelLeft,
  CheckCheck,
  TestTube2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { UserNav } from "../common/user-nav";
import { Logo } from "../logo";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/admin/dashboard", icon: Home, label: "Dashboard" },
    { href: "/admin/annotators", icon: Users, label: "Annotators" },
    { href: "/admin/data", icon: Database, label: "Data" },
    { href: "/admin/pilot", icon: TestTube2, label: "Pilot Test" },
    { href: "/admin/agreement", icon: CheckCheck, label: "Agreement" },
];

export function AdminSidebar() {
    const pathname = usePathname();
  
    const navLinks = (
        <TooltipProvider>
            {navItems.map((item) => (
            <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                <Link
                    href={item.href}
                    className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                        pathname.startsWith(item.href) && "bg-accent text-accent-foreground"
                    )}
                >
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{item.label}</span>
                </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
            ))}
        </TooltipProvider>
    );

    return (
        <>
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
            <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
            <Link
                href="#"
                className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
            >
                <Logo className="h-4 w-4 transition-all group-hover:scale-110" />
                <span className="sr-only">QAFiqih</span>
            </Link>
            {navLinks}
            </nav>
            <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
            <UserNav />
            </nav>
        </aside>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <Sheet>
            <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Buka Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs flex flex-col">
                <SheetHeader>
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <SheetDescription className="sr-only">Navigasi utama untuk admin.</SheetDescription>
                </SheetHeader>
                <nav className="grid gap-6 text-lg font-medium">
                <Link
                    href="#"
                    className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                >
                    <Logo className="h-5 w-5 transition-all group-hover:scale-110" />
                    <span className="sr-only">QAFiqih</span>
                </Link>
                {navItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                            pathname.startsWith(item.href) && "text-foreground"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                    </Link>
                ))}
                </nav>
                <div className="mt-auto">
                    <UserNav />
                </div>
            </SheetContent>
            </Sheet>
        </header>
     </>
  );
}
