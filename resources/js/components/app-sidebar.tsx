import { useEffect, useRef, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    FolderGit2,
    LayoutGrid,
    Archive,
    ShoppingCart,
    Files,
    ClipboardCheck,
    UsersRound,
    Search as SearchIcon,
} from 'lucide-react';

import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';

import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const platformNavItems: NavItem[] = [
    { title: 'RRPPE Monitoring', href: '/rrppe-monitoring' },
    { title: 'RRSP Monitoring', href: '/rrsp-monitoring' },
    { title: 'RegSPI Monitoring', href: '/regspi-monitoring' },
    { title: 'ITR / PTR Monitoring', href: '/itr-ptr-monitoring' },
    { title: 'Pre-Repair Monitoring', href: '/pre-repair-monitoring' },
    { title: 'For-Disposal Monitoring', href: '/for-disposal-monitoring' },
    { title: 'Bona Vida Monitoring', href: '/bona-vida-monitoring' },
];

const StockNavItems: NavItem[] = [
    { title: 'Stock Items', href: '/stock-items' },
    { title: 'Transaction Logs', href: '/transaction-logs' },
    { title: 'Units', href: '/units' },
];

const procurementNavItems: NavItem[] = [
    { title: 'Purchase Orders', href: '/purchase-orders' },
    { title: 'PO Letter Monitoring', href: '/po-letter-monitoring' },
    { title: 'Deliveries', href: '/deliveries' },
    { title: 'IAR', href: '/iar' },
    { title: 'Supplier List', href: '/supplier' },
    { title: 'Fund Clusters', href: '/fund-clusters' },
];

const HRNavItems: NavItem[] = [
    { title: 'Employee File Locator', href: '/employee-file-locator' },
    { title: 'Offices', href: '/offices' },
    { title: 'Clearance', href: '/clearance' },
];

const SystemAdmin: NavItem[] = [
    { title: 'Users', href: '/users' },
    { title: 'Audit Logs', href: '/audit-logs' },
];

const footerNavItems: NavItem[] = [
    {
        title: 'System Documentation',
        href: 'https://docs.google.com/document/d/1-w0jtf2gAn7zBeCYlMCpVVMj9K19KNHWgp8PagAGQwQ/edit?usp=drive_web&ouid=103824623666035606057',
        icon: FolderGit2,
    },
];

export function AppSidebar() {
    const { url } = usePage();
    const { state, isMobile } = useSidebar();
    const isCollapsed = state === 'collapsed' && !isMobile;
    const [searchQuery, setSearchQuery] = useState('');
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                setSearchQuery('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Clear search whenever navigation happens (e.g. clicking a search result)
    useEffect(() => {
        setSearchQuery('');
    }, [url]);

    // Also clear search when the sidebar itself collapses
    useEffect(() => {
        if (isCollapsed) {
            setSearchQuery('');
        }
    }, [isCollapsed]);

    return (
        <Sidebar 
            collapsible="icon" 
            variant="inset" 
            className="bg-gradient-to-b from-[#7a0004] via-[#3d0002] to-[#220001] [&_[data-sidebar=sidebar]]:bg-transparent shadow-xl text-white

                [&_[data-sidebar=menu-button]]:transition-all
                [&_[data-sidebar=menu-button]]:duration-300
                [&_[data-sidebar=menu-button]]:ease-out
                [&_[data-sidebar=menu-button]:hover]:bg-white/10
                [&_[data-sidebar=menu-button]:hover]:backdrop-blur-md
                [&_[data-sidebar=menu-button]:hover]:shadow-lg
                [&_[data-sidebar=menu-button][data-active=true]]:bg-white/15
                [&_[data-sidebar=menu-button][data-active=true]]:backdrop-blur-lg
                [&_[data-sidebar=menu-button][data-active=true]]:border
                [&_[data-sidebar=menu-button][data-active=true]]:border-white/30
                [&_[data-sidebar=menu-button][data-active=true]]:shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]
                [&_[data-sidebar=menu-button][data-active=true]]:text-white

                [&_[data-sidebar=menu-sub-button]]:transition-all
                [&_[data-sidebar=menu-sub-button]]:duration-300
                [&_[data-sidebar=menu-sub-button]]:ease-out
                [&_[data-sidebar=menu-sub-button]]:rounded-lg
                [&_[data-sidebar=menu-sub-button]:hover]:bg-white/10
                [&_[data-sidebar=menu-sub-button]:hover]:backdrop-blur-md
                [&_[data-sidebar=menu-sub-button]:hover]:text-white
                [&_[data-sidebar=menu-sub-button][data-active=true]]:bg-white/15
                [&_[data-sidebar=menu-sub-button][data-active=true]]:backdrop-blur-lg
                [&_[data-sidebar=menu-sub-button][data-active=true]]:border
                [&_[data-sidebar=menu-sub-button][data-active=true]]:border-white/30
                [&_[data-sidebar=menu-sub-button][data-active=true]]:shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]
                [&_[data-sidebar=menu-sub-button][data-active=true]]:text-white"
        >
            <div ref={sidebarRef} className="flex h-full min-h-0 flex-1 flex-col">
                <SidebarHeader className="gap-3 px-3 pt-3">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild>
                                <Link href={dashboard()} prefetch>
                                    <AppLogo />
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>

                    {!isCollapsed && (
                        <div className="relative px-1">
                            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/50" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search module..."
                                className="h-9 w-full rounded-lg border border-white/15 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/30"
                            />
                        </div>
                    )}
                </SidebarHeader>
                <SidebarContent>
                    <NavMain
                        searchQuery={searchQuery}
                        sections={[
                            {
                                title: 'Assets',
                                icon: Archive,
                                items: platformNavItems,
                            },
                            {
                                title: 'Procurement',
                                icon: ShoppingCart,
                                items: procurementNavItems,
                            },
                            {
                                title: 'Personnel Files',
                                icon: Files,
                                items: HRNavItems,
                            },
                            {
                                title: 'Stock Cards',
                                icon: ClipboardCheck,
                                items: StockNavItems,
                            },
                            {
                                title: 'System/Administration',
                                icon: UsersRound,
                                items: SystemAdmin,
                            },
                        ]}
                    />
                </SidebarContent>
                <SidebarFooter>
                    <NavFooter items={footerNavItems} className="mt-auto" />
                    <NavUser />
                </SidebarFooter>
            </div>
        </Sidebar>
    );
}