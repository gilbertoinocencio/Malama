/**
 * Returns the local date string in YYYY-MM-DD format.
 * Uses local timezone instead of UTC to avoid date shifting
 * for users in UTC-offset timezones (e.g. Brazil UTC-3).
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
