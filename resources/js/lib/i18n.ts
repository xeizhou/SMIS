import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    calendar: {
      common: {
        loading: "Loading...",
        cancel: "Cancel",
        save: "Save",
        saving: "Saving...",
        creating: "Creating...",
        edit: "Edit",
        from: "From",
        to: "To",
        apply: "Apply",
      },
      events: {
        addEvent: "Add Event",
        editEvent: "Edit Event",
        viewEventDetails: "View event details",
        user: "User",
        title: "Title",
        startDate: "Start Date",
        startTime: "Start Time",
        endDate: "End Date",
        endTime: "End Time",
        color: "Color",
        description: "Description",
        eventCount_one: "{{count}} event",
        eventCount_other: "{{count}} events",
        dayCount: "Day {{current}} of {{total}}",
        noEventsScheduled: "No events scheduled",
      },
      colors: {
        blue: "Blue",
        green: "Green",
        red: "Red",
        yellow: "Yellow",
        purple: "Purple",
        orange: "Orange",
        gray: "Gray",
      },
      accessibility: {
        viewByDay: "View by day",
        viewByWeek: "View by week",
        viewByMonth: "View by month",
        viewByYear: "View by year",
        viewByAgenda: "View by agenda",
        selectBadgeVariant: "Select badge variant",
      },
      settings: {
        startTimeLabel: "Start time",
        endTimeLabel: "End time",
        workingHours: "Working hours",
        workingHoursTooltip: "Set the hours you're available each day",
        closed: "Closed",
      },
      weekdays: {
        sunday: "Sunday",
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
      },
      userSelect: {
        all: "All",
        selectOption: "Select an option",
      },
      dayView: {
        happeningNow: "Happening now",
        noAppointments: "No appointments",
      },
      weekView: {
        notAvailableOnMobile: "Week view isn't available on mobile",
        switchToOtherView: "Switch to day or month view instead",
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  ns: ["calendar"],
  defaultNS: "calendar",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;