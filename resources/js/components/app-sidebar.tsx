import { Link } from '@inertiajs/react';
import { BookOpen, FolderGit2, LayoutGrid, Archive, ShoppingCart, Files, ClipboardCheck, UsersRound } from 'lucide-react';

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
} from '@/components/ui/sidebar';

import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const platformNavItems: NavItem[] = [
    {
        title: 'RRPPE Monitoring',
        href: '/rrppe-monitoring',
    },
    {
        title: 'RRSP Monitoring',
        href: '/rrsp-monitoring',
    },
    {
        title: 'RegSPI Monitoring',
        href: '/regspi-monitoring',
    },
    {
        title: 'ITR / PTR Monitoring',
        href: '/itr-ptr-monitoring',
    },
    {
        title: 'Pre-Repair Monitoring',
        href: '/pre-repair-monitoring',
    },
    {
        title: 'For-Disposal Monitoring',
        href: '/for-disposal-monitoring',
    },
    {
        title: 'Bona Vida Monitoring',
        href: '/bona-vida-monitoring',
    },
];

const StockNavItems: NavItem[] = [
    {
        title: 'Stock Items',
        href: '/stock-items',
    },
    {
        title: 'Transaction Logs',
        href: '/transaction-logs',
    },
    {
        title: 'Units',
        href: '/units',
    },
]

const procurementNavItems: NavItem[] = [
    {
        title: 'Purchase Orders',
        href: '/purchase-orders',
    },
    {
        title: 'PO Letter Monitoring',
        href: '/po-letter-monitoring',
    },
    {
        title: 'Deliveries',
        href: '/deliveries',
    },
    {
        title: 'IAR',
        href: '/iar',
    },
    {
        title: 'Fund Clusters',
        href: '/fund-clusters',
      
    },
];

const HRNavItems: NavItem[] = [
    {
        title: 'Employee File Locator',
        href: '/employee-file-locator',
        
    },
    {
        title: 'Offices',
        href: '/offices',
        
    },
    {
        title: 'Clearance',
        href: '/clearance',
        
    },
];

const SystemAdmin: NavItem[] = [
    {
        title: 'Users',
        href: '/users'
    }
,
    {
        title: 'Audit Logs',
        href: '/audit-logs'
    },
];


const footerNavItems: NavItem[] = [
    {
        title: 'System Documentation',
        href: 'https://docs.google.com/document/d/1-w0jtf2gAn7zBeCYlMCpVVMj9K19KNHWgp8PagAGQwQ/edit?usp=drive_web&ouid=103824623666035606057',
        icon: FolderGit2,
    },

];

export function AppSidebar() {
    return (
        <Sidebar 
            collapsible="icon" 
            variant="inset" 
            className="bg-gradient-to-b from-[#7a0004] via-[#3d0002] to-[#220001] [&_[data-sidebar=sidebar]]:bg-transparent shadow-xl text-white"
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
                <SidebarContent>
                    <NavMain
                        sections={[
                            {
                                title: 'Property',
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
        </Sidebar>
    );
}