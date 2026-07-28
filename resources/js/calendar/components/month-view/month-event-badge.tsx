import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { endOfDay, isSameDay, parseISO, startOfDay } from "date-fns";
import { useTranslation } from "react-i18next";

import { EventDetailsDialog } from "@/calendar/components/dialogs/event-details-dialog";
import { DraggableEvent } from "@/calendar/components/dnd/draggable-event";
import type { IEvent } from "@/calendar/interfaces";
import { formatTime } from "@/lib/date-formats";
import { getDateLocale } from "@/lib/date-locale";


import { cn } from "@/lib/utils";

import { useCalendarPreferences } from "@/stores/calendar-store";

const eventBadgeVariants = cva(
  "mx-1 flex size-auto h-6.5 select-none items-center justify-between gap-1.5 truncate whitespace-nowrap rounded-md border px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  {
    variants: {
      color: {
        // Colored and mixed variants
        blue: "border-sky-500 bg-sky-50/70 text-sky-600 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-400 [&_.event-dot]:fill-sky-500",
        green: "border-emerald-500 bg-emerald-50/70 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 [&_.event-dot]:fill-emerald-500",
        red: "border-rose-500 bg-rose-50/70 text-rose-600 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400 [&_.event-dot]:fill-rose-500",
        yellow: "border-amber-500 bg-amber-50/70 text-amber-600 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 [&_.event-dot]:fill-amber-500",
        purple: "border-indigo-500 bg-indigo-50/70 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400 [&_.event-dot]:fill-indigo-500",
        orange: "border-orange-500 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300 [&_.event-dot]:fill-orange-600",
        gray: "border-neutral-500 bg-neutral-50 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 [&_.event-dot]:fill-neutral-600",

        // Dot variants
        "blue-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-sky-500",
        "green-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-emerald-500",
        "red-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-rose-500",
        "yellow-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-amber-500",
        "purple-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-indigo-500",
        "orange-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-orange-600",
        "gray-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-neutral-600",
      },
      multiDayPosition: {
        first: "relative z-10 mr-0 w-[calc(100%_-_3px)] rounded-r-none border-r-0 [&>span]:mr-2.5",
        middle: "relative z-10 mx-0 w-[calc(100%_+_1px)] rounded-none border-x-0",
        last: "ml-0 rounded-l-none border-l-0",
        none: "",
      },
    },
    defaultVariants: {
      color: "blue-dot",
    },
  }
);

interface IProps extends Omit<VariantProps<typeof eventBadgeVariants>, "color" | "multiDayPosition"> {
  event: IEvent;
  cellDate: Date;
  eventCurrentDay?: number;
  eventTotalDays?: number;
  className?: string;
  position?: "first" | "middle" | "last" | "none";
}

export function MonthEventBadge({ event, cellDate, eventCurrentDay, eventTotalDays, className, position: propPosition }: IProps) {
  const { badgeVariant } = useCalendarPreferences();
  const { t, i18n } = useTranslation("calendar");
  const locale = getDateLocale(i18n.language);

  const itemStart = startOfDay(parseISO(event.startDate));
  const itemEnd = endOfDay(parseISO(event.endDate));

  if (cellDate < itemStart || cellDate > itemEnd) {
return null;
}

  let position: "first" | "middle" | "last" | "none" | undefined;

  if (propPosition) {
    position = propPosition;
  } else if (eventCurrentDay && eventTotalDays) {
    position = "none";
  } else if (isSameDay(itemStart, itemEnd)) {
    position = "none";
  } else if (isSameDay(cellDate, itemStart)) {
    position = "first";
  } else if (isSameDay(cellDate, itemEnd)) {
    position = "last";
  } else {
    position = "middle";
  }

  const renderBadgeText = ["first", "none"].includes(position);

  const color = (badgeVariant === "dot" ? `${event.color}-dot` : event.color) as VariantProps<typeof eventBadgeVariants>["color"];

  const eventBadgeClasses = cn(eventBadgeVariants({ color, multiDayPosition: position, className }));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();

      if (e.currentTarget instanceof HTMLElement) {
e.currentTarget.click();
}
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow drag to start by not preventing default
    e.stopPropagation();
  };

  return (
    <DraggableEvent event={event}>
      <EventDetailsDialog event={event}>
        <div role="button" tabIndex={0} className={eventBadgeClasses} onKeyDown={handleKeyDown} onMouseDown={handleMouseDown}>
          <div className="flex items-center gap-1.5 truncate">
            {!["middle", "last"].includes(position) && ["mixed", "dot"].includes(badgeVariant) && (
              <svg width="8" height="8" viewBox="0 0 8 8" className="event-dot shrink-0">
                <circle cx="4" cy="4" r="4" />
              </svg>
            )}

            {renderBadgeText && (
              <p className="flex-1 truncate font-semibold">
                {eventCurrentDay && eventTotalDays && (
                  <span className="text-xs">{t("events.dayCount", { current: eventCurrentDay, total: eventTotalDays })} • </span>
                )}
                {event.title}
              </p>
            )}
          </div>

          {renderBadgeText && <span>{formatTime(new Date(event.startDate), i18n.language, locale)}</span>}
        </div>
      </EventDetailsDialog>
    </DraggableEvent>
  );
}
