import { parseISO } from "date-fns";
import { Calendar, Clock, Text, User, ArrowRight, ClipboardList, Package } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { IEvent } from "@/calendar/interfaces";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "@inertiajs/react";
import { calendarHighlight } from "../../../pages/calendar/calendarHighlight";

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
          <DialogHeader className="border-b border-neutral-100 pb-3 dark:border-neutral-800 space-y-1">
            <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{event.title}</DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 font-medium">View delivery details</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 text-sm">
            <div className="flex gap-3 items-start">
              <User className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Supplier</p>
                <p className="font-medium text-neutral-800 dark:text-neutral-200">
                  {event.description?.match(/Supplier:\s*(.*?)\s*(?:Status:|End User:|$)/)?.[1]?.trim() || event.user.name || "—"}
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Calendar className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Due Date</p>
                <p className="font-medium text-neutral-800 dark:text-neutral-200">{formatDate(startDate, "fullDate", i18n.language, locale)}</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <ClipboardList className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Status</p>
                <p className="font-medium text-neutral-800 dark:text-neutral-200">
                  {event.description?.match(/Status:\s*(.*?)\s*(?:Supplier:|End User:|$)/)?.[1]?.trim() || "—"}
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Package className="mt-0.5 size-4 text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <p className="font-semibold text-xs text-neutral-500 uppercase tracking-wider mb-0.5">End User</p>
                <p className="font-medium text-neutral-800 dark:text-neutral-200">
                  {event.description?.match(/End User:\s*(.*?)\s*(?:Supplier:|Status:|$)/)?.[1]?.trim() || "—"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Link 
                href={`/deliveries?highlight_id=${event.id}`}
                onClick={() => calendarHighlight(event.id.toString(), '/deliveries')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 hover:bg-red-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors focus-visible:outline-none w-full sm:w-auto"
            >
                Go to <ArrowRight className="size-4" />
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
