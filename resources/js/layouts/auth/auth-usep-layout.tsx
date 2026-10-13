import { Link } from '@inertiajs/react';
import { useState, type PropsWithChildren } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthUsepLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthLayoutProps>) {
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
        <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-br from-[#4a0f14] via-[#2c090d] to-[#160406] p-6 md:p-10">
            {/* Decoupled background image layer - non-blocking, low-priority, async decoding */}
            <div
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
                aria-hidden="true"
            >
                <picture>
                    <source srcSet="/images/Login.webp" type="image/webp" />
                    <img
                        src="/images/Login.png"
                        alt=""
                        fetchPriority="low"
                        decoding="async"
                        className={`h-full w-full object-cover object-center transition-opacity duration-700 ${
                            imageLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        onLoad={() => setImageLoaded(true)}
                    />
                </picture>
            </div>

            {/* Content */}
            <div className="relative z-10 flex w-full max-w-6xl flex-col items-center justify-between gap-12 md:flex-row">
                <div className="max-w-sm text-center text-white md:pr-8 md:text-left">
                    <h1 className="font-sfpro text-4xl leading-[1.05] font-semibold tracking-tight md:text-5xl lg:text-6xl">
                        <span className="whitespace-nowrap">
                            Supply Management{' '}
                        </span>
                        <br />
                        Unit
                    </h1>
                    <p className="mt-3 font-cinzel text-xs font-light tracking-widest whitespace-nowrap text-white/85 uppercase md:text-base">
                        University of Southeastern Philippines
                    </p>
                </div>

                <div className="w-full max-w-sm rounded-2xl border border-white/35 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-xl">
                    <div className="mb-5 flex flex-col items-center gap-3">
                        <Link
                            href="/"
                            className="flex flex-col items-center gap-2"
                        >
                            <div className="flex h-16 w-16 items-center justify-center">
                                <AppLogoIcon className="size-15 fill-current text-[#4a0f14]" />
                            </div>
                        </Link>
                        <div className="space-y-1 text-center">
                            <h2 className="text-xl font-semibold">{title}</h2>
                            {description && (
                                <p className="text-sm text-white/80">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="[&_a]:text-white [&_a]:underline [&_button[type='submit']]:!border-none [&_button[type='submit']]:!bg-[#991B1E] [&_button[type='submit']]:!text-white [&_button[type='submit']]:hover:!bg-[#7d1618] [&_input]:border-white/30 [&_input]:bg-white/5 [&_input]:text-white [&_input]:placeholder:text-white/60 [&_label]:text-white [&_p]:text-white [&_span]:text-white">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
