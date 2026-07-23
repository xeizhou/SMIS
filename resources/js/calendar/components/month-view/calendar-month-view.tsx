import { format, startOfWeek, addDays } from "date-fns";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";


import { DayCell } from "@/calendar/components/month-view/day-cell";
import { getCalendarCells, calculateMonthEventPositions } from "@/calendar/helpers";
import type { IEvent } from "@/calendar/interfaces";
import { getDateLocale } from "@/lib/date-locale";

import { useCalendarDate } from "@/stores/calendar-store";

interface IProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

export function CalendarMonthView({ singleDayEvents, multiDayEvents }: IProps) {
  const { selectedDate } = useCalendarDate();
  const { i18n } = useTranslation('calendar');
  const locale = getDateLocale(i18n.language);

  const allEvents = [...multiDayEvents, ...singleDayEvents];

  const cells = useMemo(() => getCalendarCells(selectedDate), [selectedDate]);

  const eventPositions = useMemo(
    () => calculateMonthEventPositions(multiDayEvents, singleDayEvents, selectedDate),
    [multiDayEvents, singleDayEvents, selectedDate]
  );

  // Generate week days based on locale
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { locale });

    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i);

      return format(day, "EEE", { locale });
    });
  }, [locale]);

  return (
    <div>
      <div className="grid grid-cols-7 divide-x">
        {weekDays.map((day, index) => (
          <div key={index} className="flex items-center justify-center py-2">
            <span className="text-xs font-medium text-muted-foreground">{day}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 overflow-hidden">
        {cells.map(cell => (
          <DayCell key={cell.date.toISOString()} cell={cell} events={allEvents} eventPositions={eventPositions} />
        ))}
      </div>
    </div>
  );
}
