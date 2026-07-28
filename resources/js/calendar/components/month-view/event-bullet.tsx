import { cva } from "class-variance-authority";

import type { TEventColor } from "@/calendar/types";
import { cn } from "@/lib/utils";


const eventBulletVariants = cva("size-2 rounded-full", {
  variants: {
    color: {
      blue: "bg-sky-500",
      green: "bg-emerald-500",
      red: "bg-rose-500",
      yellow: "bg-amber-500",
      purple: "bg-indigo-500",
      gray: "bg-neutral-500",
      orange: "bg-orange-500",
    },
  },
  defaultVariants: {
    color: "blue",
  },
});

export function EventBullet({ color, className }: { color: TEventColor; className: string }) {
  return <div className={cn(eventBulletVariants({ color, className }))} />;
}
