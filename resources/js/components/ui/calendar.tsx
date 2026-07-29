"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import * as SelectPrimitive from "@radix-ui/react-select";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDateLocale } from "@/lib/date-locale";
import type { Locale } from "date-fns";
import type { DropdownProps } from "react-day-picker";

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
    formatMonthDropdown: (month: Date) => {
      return format(month, "MMM", { locale });
    },
  };

  return (
    <DayPicker
      locale={locale}
      formatters={formatters}
      showOutsideDays={showOutsideDays}
      className={cn("p-3 relative", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 relative",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center text-sm font-medium",
        nav: "flex items-center justify-between absolute w-full z-10 px-1 pt-1 left-0 pointer-events-none",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 pointer-events-auto"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 pointer-events-auto"
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
        dropdowns: "flex justify-center gap-2",
        dropdown_root: "relative inline-flex items-center",
        dropdown: "absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer appearance-none",
        caption_label: "text-sm font-medium flex items-center gap-1",
        ...classNames,
      }}
      components={{
        Dropdown: ({ value, onChange, options }: DropdownProps) => {
          const selected = options?.find((child) => child.value === value)?.label;
          const handleChange = (val: string) => {
            const changeEvent = {
              target: { value: val },
            } as React.ChangeEvent<HTMLSelectElement>;
            onChange?.(changeEvent);
          };
          return (
            <Select value={value?.toString()} onValueChange={handleChange}>
              <SelectTrigger className="pr-1.5 focus:ring-0 h-8 w-fit text-sm font-medium bg-transparent border-none gap-1 py-0">
                <SelectValue>{selected}</SelectValue>
              </SelectTrigger>
              <SelectPrimitive.Content
                position="popper"
                className="bg-popover text-popover-foreground relative z-50 max-h-[200px] min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border shadow-md data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1"
              >
                <SelectPrimitive.Viewport className="p-1">
                {options?.map((option, id: number) => (
                  <SelectItem key={`${option.value}-${id}`} value={option.value?.toString() ?? ""} disabled={option.disabled}>
                    {option.label}
                  </SelectItem>
                ))}
                </SelectPrimitive.Viewport>
              </SelectPrimitive.Content>
            </Select>
          );
        },
        Chevron: ({ orientation }) => {
          if (orientation === "left") return <ChevronLeft className="size-4" />;
          if (orientation === "right") return <ChevronRight className="size-4" />;
          if (orientation === "up") return <ChevronUp className="size-4" />;
          if (orientation === "down") return <ChevronDown className="size-4" />;
          return <ChevronDown className="size-4" />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };