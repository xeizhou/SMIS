import { parseISO } from "date-fns";
import { Calendar, Clock, Text, User, MoveRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { IEvent } from "@/calendar/interfaces";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { formatDate } from "@/lib/date-formats";
import { getDateLocale } from "@/lib/date-locale";

interface IProps {
  event: IEvent;
  children: React.ReactNode;
}

export function EventDetailsDialog({ event, children }: IProps) {
  const { t, i18n } = useTranslation('calendar');
  const locale = getDateLocale(i18n.language);
  const startDate = parseISO(event.startDate);
  const endDate = parseISO(event.endDate);

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>{event.title}</DialogTitle>
            <DialogDescription>{t("events.viewEventDetails")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <User className="mt-1 size-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t("events.user")}</p>
                <p className="text-sm text-muted-foreground">{event.user.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="mt-1 size-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t("events.startDate")}</p>
                <p className="text-sm text-muted-foreground">{formatDate(startDate, "dateTimeWithTime", i18n.language, locale)}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="mt-1 size-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t("events.endDate")}</p>
                <p className="text-sm text-muted-foreground">{formatDate(endDate, "dateTimeWithTime", i18n.language, locale)}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Text className="mt-1 size-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t("events.description")}</p>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <a 
                href={`/deliveries?highlight_search=${event.title}`}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-100 shadow-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 focus-visible:outline-none w-full sm:w-auto"
            >
                Go to <MoveRight className="size-4" />
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
