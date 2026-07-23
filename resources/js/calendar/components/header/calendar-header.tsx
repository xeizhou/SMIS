import { Link, usePage } from "@inertiajs/react";
import { Columns, Grid3x3, List, Plus, Grid2x2, CalendarRange } from "lucide-react";
import { useMemo, Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";


import { DateNavigator } from "@/calendar/components/header/date-navigator";
import { TodayButton } from "@/calendar/components/header/today-button";
import { UserSelect } from "@/calendar/components/header/user-select";

// Lazy load dialog component
const AddEventDialog = lazy(() =>
  import("@/calendar/components/dialogs/add-event-dialog").then(module => ({
    default: module.AddEventDialog,
  }))
);

import type { IEvent } from "@/calendar/interfaces";
import type { TCalendarView } from "@/calendar/types";
import { Button } from "@/components/ui/button";

interface IProps {
  events: IEvent[];
}

export function CalendarHeader({ events }: IProps) {
  const { t } = useTranslation('calendar');
  const { url } = usePage(); // Inertia's current URL, e.g. "/calendar/month"

  const view = useMemo(() => {
    const pathSegments = url.split("/");
    const viewSegment = pathSegments[pathSegments.length - 1];

    const validViews: TCalendarView[] = ["month", "week", "day", "year", "agenda"];

    if (validViews.includes(viewSegment as TCalendarView)) {
      return viewSegment as TCalendarView;
    }

    return "month" as TCalendarView;
  }, [url]);

  return (
    <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <TodayButton />
        <DateNavigator events={events} />
      </div>

      <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:justify-between">
        <div className="flex w-full items-center gap-1.5">
          <div className="inline-flex first:rounded-r-none last:rounded-l-none [&:not(:first-child):not(:last-child)]:rounded-none">
            <Button
              asChild
              aria-label={t("accessibility.viewByDay")}
              size="icon"
              variant={view === "day" ? "default" : "outline"}
              className="rounded-r-none [&_svg]:size-5"
            >
              <Link href="/calendar/day">
                <List strokeWidth={1.8} />
              </Link>
            </Button>

            <Button
              asChild
              aria-label={t("accessibility.viewByWeek")}
              size="icon"
              variant={view === "week" ? "default" : "outline"}
              className="-ml-px rounded-none [&_svg]:size-5"
            >
              <Link href="/calendar/week">
                <Columns strokeWidth={1.8} />
              </Link>
            </Button>

            <Button
              asChild
              aria-label={t("accessibility.viewByMonth")}
              size="icon"
              variant={view === "month" ? "default" : "outline"}
              className="-ml-px rounded-none [&_svg]:size-5"
            >
              <Link href="/calendar/month">
                <Grid2x2 strokeWidth={1.8} />
              </Link>
            </Button>

            <Button
              asChild
              aria-label={t("accessibility.viewByYear")}
              size="icon"
              variant={view === "year" ? "default" : "outline"}
              className="-ml-px rounded-none [&_svg]:size-5"
            >
              <Link href="/calendar/year">
                <Grid3x3 strokeWidth={1.8} />
              </Link>
            </Button>

            <Button
              asChild
              aria-label={t("accessibility.viewByAgenda")}
              size="icon"
              variant={view === "agenda" ? "default" : "outline"}
              className="-ml-px rounded-l-none [&_svg]:size-5"
            >
              <Link href="/calendar/agenda">
                <CalendarRange strokeWidth={1.8} />
              </Link>
            </Button>
          </div>

          <UserSelect />
        </div>

        <Suspense
          fallback={
            <Button className="w-full sm:w-auto" disabled>
              <Plus />
              {t("events.addEvent")}
            </Button>
          }
        >
          <AddEventDialog>
            <Button className="w-full sm:w-auto">
              <Plus />
              {t("events.addEvent")}
            </Button>
          </AddEventDialog>
        </Suspense>
      </div>
    </div>
  );
}
