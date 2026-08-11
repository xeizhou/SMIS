import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md">
                <AppLogoIcon className="h-full w-full object-contain" />
            </div>
            <div className="ml-1.5 flex flex-col justify-center overflow-hidden text-left transition-all duration-150 ease-linear group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:-translate-x-2 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0">
                <span
                    className="block w-[180px] shrink-0 text-base leading-[1.1] font-semibold tracking-normal whitespace-nowrap text-white"
                    style={{ wordSpacing: '-1px' }}
                >
                    Supply Management <br />
                    Inventory System
                </span>
            </div>
        </>
    );
}