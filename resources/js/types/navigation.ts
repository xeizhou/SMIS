import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export interface NavItem {
    title: string;
    href?: string;
    icon?: LucideIcon;
    items?: NavItem[];
    external?: boolean;
}