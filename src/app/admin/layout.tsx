// src/app/admin/layout.tsx
import { ReactNode, Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/actions/authActions';
import { Home, LogOut, ShieldCheck, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AdminNav } from './_components/AdminNav';
import { logoutUser } from '@/actions/authActions';
import { ThemeToggleImproved as ThemeToggleCompact } from '@/components/ui/ThemeToggleImproved';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AdminLoading } from './_components/AdminLoading';

export default function AdminLayout({ children }: { children: ReactNode }) {
  // The auth check is now handled by middleware.ts, so we don't need to
  // make this component async to await getCurrentUser(). This fixes the
  // conflict between Suspense and the PageTransitionWrapper.
  return (
    <>
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto flex justify-between items-center max-w-7xl h-16 px-4">
            <div className="flex items-center gap-2 sm:gap-4">
                <div className="md:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <PanelLeft className="h-5 w-5" />
                        <span className="sr-only">Toggle Menu</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="pr-0 pt-12"><AdminNav /></SheetContent>
                  </Sheet>
                </div>
                <ShieldCheck className="h-6 w-6 text-primary" />
                <span className="text-base sm:text-lg font-semibold tracking-tight">Admin Console</span>
            </div>
            <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/create" legacyBehavior><Home className="mr-2 h-4 w-4" />Back to App</Link>
                </Button>
                <ThemeToggleCompact />
                <form action={logoutUser}>
                    <Button variant="ghost" size="sm"><LogOut className="mr-2 h-4 w-4" />Logout</Button>
                </form>
            </div>
        </div>
      </header>
      <div className="container mx-auto max-w-7xl flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 py-10">
        <aside className="fixed top-16 z-30 -ml-2 hidden h-[calc(100vh-64px)] w-full shrink-0 md:sticky md:block">
          <div className="h-full py-6 pr-6 lg:py-8">
              <AdminNav />
          </div>
        </aside>
        <main className="w-full flex-1 flex flex-col">
          <Suspense fallback={<AdminLoading />}>{children}</Suspense>
        </main>
      </div>
    </>
  );
}
