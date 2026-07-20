"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { getDateLocale } from "@/lib/date-locale";
import type { Locale } from "date-fns";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, locale: propsLocale, ...props }: CalendarProps) {
  const { i18n } = useTranslation('calendar');
  const locale: Locale = (propsLocale as Locale) ?? getDateLocale(i18n.language);

  const formatters = {
    formatCaption: (date: Date) => {
      if (i18n.language === "ko") return format(date, "yyyy년 M월", { locale });
      if (i18n.language === "ja") return format(date, "yyyy年M月", { locale });
      if (i18n.language === "zh" || i18n.language === "zh-CN" || i18n.language === "zh-TW") return format(date, "yyyy年M月", { locale });
      if (i18n.language === "de") return format(date, "MMMM yyyy", { locale });
      if (i18n.language === "fr") return format(date, "MMMM yyyy", { locale });
      if (i18n.language === "es") return format(date, "MMMM 'de' yyyy", { locale });
      if (i18n.language === "it") return format(date, "MMMM yyyy", { locale });
      if (i18n.language === "pt" || i18n.language === "pt-BR") return format(date, "MMMM 'de' yyyy", { locale });
      if (i18n.language === "ru") return format(date, "LLLL yyyy", { locale });
      if (i18n.language === "nl") return format(date, "MMMM yyyy", { locale });
      if (i18n.language === "ar") return format(date, "MMMM yyyy", { locale });
      if (i18n.language === "hi") return format(date, "MMMM yyyy", { locale });
      if (i18n.language === "th") return format(date, "MMMM yyyy", { locale });
      if (i18n.language === "vi") return format(date, "'Tháng' M 'năm' yyyy", { locale });
      if (i18n.language === "id") return format(date, "MMMM yyyy", { locale });
      if (i18n.language === "sv") return format(date, "MMMM yyyy", { locale });
      if (i18n.language === "fi") return format(date, "MMMM yyyy", { locale });
      if (i18n.language === "da") return format(date, "MMMM yyyy", { locale });
      if (i18n.language === "no" || i18n.language === "nb") return format(date, "MMMM yyyy", { locale });
      if (i18n.language === "pl") return format(date, "LLLL yyyy", { locale });
      if (i18n.language === "cs") return format(date, "LLLL yyyy", { locale });
      if (i18n.language === "hu") return format(date, "yyyy. MMMM", { locale });
      if (i18n.language === "tr") return format(date, "MMMM yyyy", { locale });
      return format(date, "MMMM yyyy", { locale });
    },
    formatWeekdayName: (date: Date) => {
      return format(date, "EEE", { locale });
    },
  };

  return (
    <DayPicker
      locale={locale}
      formatters={formatters}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center text-sm font-medium",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].range-end)]:rounded-r-md [&:has([aria-selected].outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day_button: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        range_end: "range-end",
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };