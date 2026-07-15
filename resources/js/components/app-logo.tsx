import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md">
                <AppLogoIcon className="h-full w-full object-contain" />
            </div>
            <div className="ml-1.5 flex flex-col justify-center text-left">
                {/* System Name */}
                <span 
                    className="text-white block text-sm font-semibold tracking-tight leading-[1.1]"
                    style={{ wordSpacing: '-1px' }}
                >
                    Supply Management <br/>
                    Inventory System
                </span>
            </div>
        </>
    );
}