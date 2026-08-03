import { Link, usePage } from '@inertiajs/react';
import { ChevronRight  } from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import type {NavItem} from '@/types';

export interface NavSection {
    title: string;
    icon?: LucideIcon;
    items: NavItem[];
}

function hrefToUrl(href: NavItem['href']) {
    if (typeof href === 'string') {
return href;
}

    return (href as { url?: string })?.url ?? '#';
}

// Strips the query string (and hash) so that /units?search=abc
// still matches the nav item pointing to /units.
function stripQuery(url: string) {
    return url.split('?')[0].split('#')[0];
}

export function NavMain({
    sections = [],
    searchQuery = '',
}: {
    sections: NavSection[];
    searchQuery?: string;
}) {
    const page = usePage();
    const { state, isMobile } = useSidebar();
    const isCollapsed = state === 'collapsed' && !isMobile;

    const currentPath = stripQuery(page.url);

    const initiallyOpen = sections.find((section) =>
        section.items.some((item) => hrefToUrl(item.href) === currentPath),
    )?.title;

    const [openSection, setOpenSection] = useState<string | undefined>(
        initiallyOpen,
    );

    const query = searchQuery.trim().toLowerCase();
    const isSearching = query.length > 0;

    // Keep the accordion synced to whatever section contains the current page,
    // e.g. after navigating from a search result, or after searching/filtering
    // within a page (which only changes the query string, not the path).
    useEffect(() => {
        const resetOpenSection = () => {
            const activeSection = sections.find((section) =>
                section.items.some(
                    (item) => hrefToUrl(item.href) === currentPath,
                ),
            );
            setOpenSection(activeSection ? activeSection.title : undefined);
        };

        if (!isSearching) {
            resetOpenSection();
        }

        window.addEventListener('reset-sidebar-nav', resetOpenSection);
        return () => window.removeEventListener('reset-sidebar-nav', resetOpenSection);
    }, [currentPath, searchQuery, isSearching, sections]);

    const filteredSections = sections
        .map((section) => ({
            ...section,
            items: isSearching
                ? section.items.filter((item) =>
                      item.title.toLowerCase().includes(query),
                  )
                : section.items,
        }))
        .filter((section) => !isSearching || section.items.length > 0);

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="tracking-widest">
                NAVIGATION
            </SidebarGroupLabel>
            <div className="mx-2 mb-2 border-b border-white/10" />

            <SidebarMenu>
                {filteredSections.length === 0 && (
                    <p className="px-2 py-3 text-sm text-white/50">
                        No modules found.
                    </p>
                )}

                {filteredSections.map((section) => {
                    const isSectionActive = section.items.some(
                        (item) => hrefToUrl(item.href) === currentPath,
                    );

                    if (isCollapsed) {
                        return (
                            <SidebarMenuItem key={section.title}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            tooltip={{
                                                children: section.title,
                                            }}
                                            isActive={isSectionActive}
                                        >
                                            {section.icon && <section.icon />}
                                            <span>{section.title}</span>
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        side="right"
                                        align="start"
                                        className="min-w-48"
                                    >
                                        {section.items.map((item) => (
                                            <DropdownMenuItem
                                                key={item.title}
                                                asChild
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </SidebarMenuItem>
                        );
                    }

                    const isOpen = isSearching
                        ? true
                        : openSection === section.title;

                    return (
                        <Collapsible
                            key={section.title}
                            asChild
                            open={isOpen}
                            onOpenChange={(open) => {
                                if (!isSearching) {
                                    setOpenSection(
                                        open ? section.title : undefined,
                                    );
                                }
                            }}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        tooltip={{ children: section.title }}
                                        isActive={isSectionActive}
                                    >
                                        {section.icon && <section.icon />}
                                        <span>{section.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                                    <SidebarMenuSub>
                                        {section.items.map((item) => {
                                            const url = hrefToUrl(item.href);

                                            return (
                                                <SidebarMenuSubItem
                                                    key={item.title}
                                                >
                                                    <SidebarMenuSubButton
                                                        asChild
                                                        isActive={
                                                            url === currentPath
                                                        }
                                                    >
                                                        <Link
                                                            href={item.href}
                                                            prefetch
                                                        >
                                                            {item.icon && (
                                                                <item.icon />
                                                            )}
                                                            <span>
                                                                {item.title}
                                                            </span>
                                                        </Link>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            );
                                        })}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}