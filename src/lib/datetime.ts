import { addDays, addMonths, differenceInCalendarDays, format } from "date-fns";
import { APP_TIMEZONE } from "@/lib/constants";

const SEOUL_OFFSET_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function formatSeoul(date: Date, pattern = "yyyy.MM.dd HH:mm") {
  const parts = Object.fromEntries(
    SEOUL_OFFSET_FORMATTER.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const asDate = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+09:00`,
  );
  return format(asDate, pattern);
}

export function formatSeoulDate(date: Date) {
  return formatSeoul(date, "yyyy.MM.dd");
}

export function addCalendarMonths(start: Date, months: number) {
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();
  const hours = start.getUTCHours();
  const minutes = start.getUTCMinutes();
  const seconds = start.getUTCSeconds();
  const millis = start.getUTCMilliseconds();
  const tentative = new Date(Date.UTC(year, month + months, 1, hours, minutes, seconds, millis));
  const lastDay = new Date(Date.UTC(tentative.getUTCFullYear(), tentative.getUTCMonth() + 1, 0)).getUTCDate();
  tentative.setUTCDate(Math.min(day, lastDay));
  return tentative;
}

export function daysUntil(target: Date, from = new Date()) {
  return differenceInCalendarDays(target, from);
}

export function plusDays(date: Date, days: number) {
  return addDays(date, days);
}

export function addCalendarMonthsFromNow(months: number, from = new Date()) {
  return addCalendarMonths(from, months);
}

export { addMonths };
