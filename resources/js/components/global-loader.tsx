import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';

export function GlobalLoader() {
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        
        const start = () => {
            // Add a small delay so very fast requests don't cause a brief flash
            timeout = setTimeout(() => setIsLoading(true), 250);
        };
        
        const stop = () => {
            clearTimeout(timeout);
            setIsLoading(false);
        };

        const unsubscribeStart = router.on('start', start);
        const unsubscribeFinish = router.on('finish', stop);

        return () => {
            unsubscribeStart();
            unsubscribeFinish();
            clearTimeout(timeout);
        };
    }, []);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 transition-all duration-300">
            <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl bg-card p-8 shadow-2xl border animate-in fade-in zoom-in-95 duration-300">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-semibold text-foreground animate-pulse tracking-tight">Processing...</p>
                <p className="text-sm text-muted-foreground">Please wait a moment</p>
            </div>
        </div>
    );
}
