import AppLogoIcon from '@/components/app-logo-icon';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthUsepLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[linear-gradient(to_top_right,#370001_5%,#891C23_35%,#DC3845_95%)] p-6 md:p-10">
            {/* Noise overlay */}
            <div
                className="pointer-events-none absolute inset-0 z-0 opacity-100 mix-blend-overlay"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                    backgroundRepeat: 'repeat',
                }}
            />
            

            {/* Content */}
            <div className="relative z-10 flex w-full max-w-6xl flex-col items-center justify-between gap-12 md:flex-row">
                <div className="max-w-sm text-center text-white md:pr-8 md:text-left">
                    <h1 className="font-sfpro text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                        <span className="whitespace-nowrap">Supply Management </span>
                        <br />
                        Unit
                    </h1>
                    <p className="mt-3 whitespace-nowrap font-cinzel text-xs font-light uppercase tracking-widest text-white/85 md:text-base">
                        University of Southeastern Philippines
                    </p>
                </div>

                <div className="w-full max-w-sm rounded-2xl border border-white/35 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-xl">
                    <div className="mb-5 flex flex-col items-center gap-3">
                        <Link href="/" className="flex flex-col items-center gap-2">
                            <div className="flex h-16 w-16 items-center justify-center ">
                                <AppLogoIcon className="size-15 fill-current text-[#4a0f14]" />
                            </div>
                        </Link>
                        <div className="space-y-1 text-center">
                            <h2 className="text-xl font-semibold">{title}</h2>
                            {description && <p className="text-sm text-white/80">{description}</p>}
                        </div>
                    </div>

                    <div
                        className="
                            [&_label]:text-white
                            [&_input]:text-white
                            [&_input]:placeholder:text-white/60
                            [&_input]:border-white/30
                            [&_input]:bg-white/5
                            [&_a]:text-white
                            [&_a]:underline
                            [&_p]:text-white
                            [&_span]:text-white
                            [&_button[type='submit']]:!bg-[#991B1E]
                            [&_button[type='submit']]:hover:!bg-[#7d1618]
                            [&_button[type='submit']]:!text-white
                            [&_button[type='submit']]:!border-none
                        "
                    >

                        
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}