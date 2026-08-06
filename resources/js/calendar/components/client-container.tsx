import { isSameDay, parseISO } from "date-fns";
import { useMemo, useState, Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { CalendarHeader } from "@/calendar/components/header/calendar-header";
import type { TCalendarView, TEventColor } from "@/calendar/types";
import type { IEvent } from "@/calendar/interfaces";
import { useCalendarStore } from "@/stores/calendar-store";
import type { DueDelivery } from "@/components/due-deliveries";

// Lazy load calendar view components for better code splitting
const CalendarMonthView = lazy(() =>
  import("@/calendar/components/month-view/calendar-month-view").then(module => ({
    default: module.CalendarMonthView,
  }))
);

const CalendarWeekView = lazy(() =>
  import("@/calendar/components/week-and-day-view/calendar-week-view").then(module => ({
    default: module.CalendarWeekView,
  }))
);

const CalendarDayView = lazy(() =>
  import("@/calendar/components/week-and-day-view/calendar-day-view").then(module => ({
    default: module.CalendarDayView,
  }))
);

const CalendarYearView = lazy(() =>
  import("@/calendar/components/year-view/calendar-year-view").then(module => ({
    default: module.CalendarYearView,
  }))
);

const CalendarAgendaView = lazy(() =>
  import("@/calendar/components/agenda-view/calendar-agenda-view").then(module => ({
    default: module.CalendarAgendaView,
  }))
);

// Loading fallback component for lazy-loaded views
function ViewLoadingFallback() {
  const { t } = useTranslation("calendar");

  return (
    <div className="p-8 text-center">
      <div className="mx-auto size-6 animate-spin rounded-full border-b-2 border-primary"></div>
      <p className="mt-2 text-sm text-muted-foreground">{t("common.loading")}</p>
    </div>
  );
}

export function ClientContainer({ deliveries = [] }: { deliveries?: DueDelivery[] }) {
  // Local view state instead of deriving it from the URL (no dedicated route in Inertia setup)
  const [view, setView] = useState<TCalendarView>("month");

  // Use individual selectors to avoid object recreation
  const selectedDate = useCalendarStore(state => state.selectedDate);
  const selectedUserId = useCalendarStore(state => state.selectedUserId);
  
  const events = useMemo<IEvent[]>(() => {
    return deliveries.map((d, index) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(d.due_date);
      due.setHours(0, 0, 0, 0);
      const diff = Math.round((due.getTime() - today.getTime()) / 86400000);

      let color: TEventColor = "green";
      if (diff < 0) color = "red";
      else if (diff === 0) color = "yellow";
      else if (diff === 1) color = "blue";
      else if (diff <= 7) color = "purple";
      
      const startDate = new Date(d.due_date);
      startDate.setHours(8, 0, 0, 0);
      const endDate = new Date(d.due_date);
      endDate.setHours(17, 0, 0, 0);

      return {
        id: d.delivery_id ?? index,
        title: d.po_number,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        color,
        description: `Supplier: ${d.supplier?.supplier_name ?? 'N/A'}\nStatus: ${d.status ?? 'Pending'}\nEnd User: ${d.end_user ?? 'N/A'}`,
        user: {
            id: d.supplier?.supplier_name ?? "No Supplier",
            name: d.supplier?.supplier_name ?? "No Supplier",
            picturePath: null,
        }
      };
    });
  }, [deliveries]);

  // Filter events based on view and user selection
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const eventStartDate = parseISO(event.startDate);
      const eventEndDate = parseISO(event.endDate);
      const isUserMatch = selectedUserId === "all" || event.user.id === selectedUserId;

      if (view === "month") {
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
        const isInSelectedMonth = eventStartDate <= monthEnd && eventEndDate >= monthStart;

        return isInSelectedMonth && isUserMatch;
      }

      if (view === "week") {
        const weekStart = new Date(selectedDate);
        weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const isInSelectedWeek = eventStartDate <= weekEnd && eventEndDate >= weekStart;

        return isInSelectedWeek && isUserMatch;
      }

      if (view === "day") {
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);

        const isInSelectedDay = eventStartDate <= dayEnd && eventEndDate >= dayStart;

        return isInSelectedDay && isUserMatch;
      }

      if (view === "year") {
        const yearStart = new Date(selectedDate.getFullYear(), 0, 1);
        const yearEnd = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999);

        const isInSelectedYear = eventStartDate <= yearEnd && eventEndDate >= yearStart;

        return isInSelectedYear && isUserMatch;
      }

      if (view === "agenda") {
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
        const isInSelectedMonth = eventStartDate <= monthEnd && eventEndDate >= monthStart;

        return isInSelectedMonth && isUserMatch;
      }

      return false;
    });
  }, [selectedDate, selectedUserId, events, view]);

  const singleDayEvents = useMemo(() => {
    return filteredEvents.filter(event => {
      const startDate = parseISO(event.startDate);
      const endDate = parseISO(event.endDate);

      return isSameDay(startDate, endDate);
    });
  }, [filteredEvents]);

  const multiDayEvents = useMemo(() => {
    return filteredEvents.filter(event => {
      const startDate = parseISO(event.startDate);
      const endDate = parseISO(event.endDate);

      return !isSameDay(startDate, endDate);
    });
  }, [filteredEvents]);

  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-xl border">
      <CalendarHeader events={events} />

      <Suspense fallback={<ViewLoadingFallback />}>
        {view === "month" && <CalendarMonthView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
        {view === "week" && <CalendarWeekView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
        {view === "day" && <CalendarDayView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
        {view === "year" && <CalendarYearView allEvents={filteredEvents} />}
        {view === "agenda" && <CalendarAgendaView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
      </Suspense>
    </div>
  );
}