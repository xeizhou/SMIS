// resources/js/components/animated-chart.tsx
import { cn } from '@/lib/utils';
import { ComponentProps } from 'react';

interface Props extends ComponentProps<'div'> {
    children?: React.ReactNode;
}

/**
 * AnimatedChart wraps chart containers with a fade-in animation.
 * 
 * Usage:
 * ```tsx
 * <AnimatedChart>
 *   <ChartContainer config={config} className="h-[240px] w-full">
 *     <BarChart data={data}>
 *       ...
 *     </BarChart>
 *   </ChartContainer>
 * </AnimatedChart>
 * ```
 */
export function AnimatedChart({ className, style, children, ...props }: Props) {
    return (
        <div
            className={cn('animate-chart-in', className)}
            style={style}
            {...props}
        >
            {children}
        </div>
    );
}
