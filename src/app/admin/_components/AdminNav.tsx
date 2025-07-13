// src/app/admin/_components/AdminNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
	{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
	{ href: '/admin/users', label: 'Users', icon: Users },
	{ href: '/admin/settings', label: 'Settings', icon: Settings },
];

const isActive = (href: string, pathname: string) => {
	return href === '/admin' ? pathname === href : pathname.startsWith(href);
};

export function AdminNav() {
	const pathname = usePathname();

	return (
        <nav className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => (
				<Button
					key={item.label}
					asChild
					variant={isActive(item.href, pathname) ? 'active' : 'ghost'}
					className="justify-start"
				>
					<Link href={item.href} legacyBehavior>
						<item.icon className="mr-2 h-4 w-4" />
						{item.label}
					</Link>
				</Button>
			))}
        </nav>
    );
}
