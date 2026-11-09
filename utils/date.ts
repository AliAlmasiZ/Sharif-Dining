/**
 * Calculates the start of the week (Saturday-based for Iranian calendar).
 * JS Date.getDay(): 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday.
 */
export function startOfWeek(d: Date = new Date()): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  // Saturday is day 6, so offset is (6 + 1) % 7 = 0
  // Sunday is day 0, so offset is (0 + 1) % 7 = 1
  // Friday is day 5, so offset is (5 + 1) % 7 = 6
  const offset = (day + 1) % 7;
  x.setDate(x.getDate() - offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Format a Date to YYYY-MM-DD format.
 */
export function formatDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format date in Persian calendar (Jalali / Solar Hijri).
 */
export function formatPersian(d: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", options).format(d);
}

/**
 * Format number as Persian localized currency string.
 */
export function formatPersianMoney(n: number | string): string {
  const num = typeof n === "string" ? Number(n) : n;
  if (isNaN(num)) return "۰";
  return num.toLocaleString("fa-IR");
}

/**
 * Format any number into Persian digits with optional fraction digits.
 */
export function formatPersianNumber(n: number | string, maximumFractionDigits: number = 1): string {
  const num = typeof n === "string" ? Number(n) : n;
  if (isNaN(num)) return "۰";
  return num.toLocaleString("fa-IR", { maximumFractionDigits });
}

/**
 * Get days of the week starting from weekStart date (Saturday to Thursday = 6 days).
 */
export function getWeekDays(weekStart: Date, count: number = 6): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}
