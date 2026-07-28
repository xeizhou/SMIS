import { Link, usePage } from "@inertiajs/react";
import { Grid2x2 } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { DateNavigator } from "@/calendar/components/header/date-navigator";
import { TodayButton } from "@/calendar/components/header/today-button";
import { UserSelect } from "@/calendar/components/header/user-select";

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
          <div className="inline-flex">
            <Button
              asChild
              aria-label={t("accessibility.viewByMonth")}
              size="icon"
              variant="default"
              className="rounded-md [&_svg]:size-5"
            >
              <Link href="#">
                <Grid2x2 strokeWidth={1.8} />
              </Link>
            </Button>
          </div>

          <UserSelect events={events} />
        </div>
      </div>
    </div>
  );
}
