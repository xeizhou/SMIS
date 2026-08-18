import { Link, router } from '@inertiajs/react';
import { LogOut, UserCircle } from 'lucide-react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

type Props = {
    user: User;
};

const LOGOUT_BROADCAST_KEY = 'auth:logout-broadcast';

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();

    const handleLogout = () => {
        cleanup();
        // Tell every other open tab (same browser, same origin) to log out too.
        // The 'storage' event only fires in OTHER tabs, never the one that
        // wrote it, so this doesn't cause a redirect loop in this tab.
        localStorage.setItem(LOGOUT_BROADCAST_KEY, Date.now().toString());
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuGroup>
                <DropdownMenuItem
                    asChild
                    className="text-white focus:bg-white/10 focus:text-white"
                >
                    <Link
                        className="block w-full cursor-pointer"
                        href={edit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <UserCircle className="mr-2 text-white/80" />
                        Profile
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
                asChild
                className="text-white focus:bg-white/10 focus:text-white"
            >
                <Link
                    className="block w-full cursor-pointer"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="mr-2 text-white/80" />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    );
}