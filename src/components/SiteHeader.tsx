"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggleImproved } from '@/components/ui/ThemeToggleImproved';
import { UserAuthStatus, useAuth } from '@/contexts/AuthContext';
import { Home, History as HistoryIcon, ShieldCheck } from 'lucide-react';
import React, { useState, useEffect } from 'react';

export function SiteHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  return (
    <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
      <div className="container mx-auto flex justify-between items-center max-w-7xl h-20 px-4">
        {/* Make Logo and Title a link to the homepage */}
        <Link
          href="/create"
          className="flex items-center gap-2.5 sm:gap-3 text-foreground hover:text-primary transition-colors"
          legacyBehavior>
          <Image
            src="/refashion.webp"
            alt="Refashion AI logo"
            width={40}
            height={60}
            className="h-12 w-auto sm:h-14 sm:w-auto"
          />
          <span className="text-xl sm:text-3xl font-bold">
            Refashion AI
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Add Navigation Links */}
          <nav className="flex items-center gap-1">
            {/* Only render the navigation buttons on the client to avoid hydration mismatch */}
            {isClient && (
              <>
                {/* Admin Console Button */}
                {user?.role === 'admin' && (
                  <Button asChild variant={pathname.startsWith('/admin') ? 'active' : 'ghost'} size="sm" className="px-2" onClick={() => setIsNavigating(true)} loading={isNavigating}>
                    <Link href="/admin" legacyBehavior><ShieldCheck className="h-5 w-5 md:mr-2" /><span className="hidden md:inline">Admin</span></Link>
                  </Button>
                )}
                {/* Conditionally render the "Create" button */}
                {pathname.startsWith('/history') && (
                  <Button asChild variant={pathname === '/create' ? 'active' : 'ghost'} size="sm" className="px-2" onClick={() => setIsNavigating(true)} loading={isNavigating}>
                    <Link href="/create" legacyBehavior><Home className="h-5 w-5 md:mr-2" /><span className="hidden md:inline">Create</span></Link>
                  </Button>
                )}
                {/* Conditionally render the "History" button */}
                {pathname.startsWith('/create') && (
                  <Button asChild variant={pathname === '/history' ? 'active' : 'ghost'} size="sm" className="px-2" onClick={() => setIsNavigating(true)} loading={isNavigating}>
                    <Link href="/history" legacyBehavior><HistoryIcon className="h-5 w-5 md:mr-2" /><span className="hidden md:inline">History</span></Link>
                  </Button>
                )}
              </>
            )}
          </nav>
          <Separator orientation="vertical" className="mx-2 h-8" />
          <ThemeToggleImproved />
        </div>
      </div>
    </header>
  );
}