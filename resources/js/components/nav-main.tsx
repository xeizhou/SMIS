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
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, type LucideIcon } from 'lucide-react';

export interface NavSection {
    title: string;
    icon?: LucideIcon;
    items: NavItem[];
}

function hrefToUrl(href: NavItem['href']) {
    if (typeof href === 'string') return href;
    return (href as { url?: string })?.url ?? '#';
}

export function NavMain({ sections = [] }: { sections: NavSection[] }) {
    const page = usePage();
    const { state, isMobile } = useSidebar();
    const isCollapsed = state === 'collapsed' && !isMobile;

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {sections.map((section) => {
                    const isSectionActive = section.items.some(
                        (item) => hrefToUrl(item.href) === page.url,
                    );

                    // ICON-COLLAPSED MODE -> flyout dropdown instead of inline accordion
                    if (isCollapsed) {
                        return (
                            <SidebarMenuItem key={section.title}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            tooltip={{ children: section.title }}
                                            isActive={isSectionActive}
                                        >
                                            {section.icon && <section.icon />}
                                            <span>{section.title}</span>
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent side="right" align="start" className="min-w-48">
                                        {section.items.map((item) => (
                                            <DropdownMenuItem key={item.title} asChild>
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

                    // EXPANDED MODE -> inline accordion, same as before
                    return (
                        <Collapsible
                            key={section.title}
                            asChild
                            defaultOpen={isSectionActive}
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
                                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                                    <SidebarMenuSub>
                                        {section.items.map((item) => {
                                            const url = hrefToUrl(item.href);
                                            return (
                                                <SidebarMenuSubItem key={item.title}>
                                                    <SidebarMenuSubButton
                                                        asChild
                                                        isActive={url === page.url}
                                                    >
                                                        <Link href={item.href} prefetch>
                                                            {item.icon && <item.icon />}
                                                            <span>{item.title}</span>
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
