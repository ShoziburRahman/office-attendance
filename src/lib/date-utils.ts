/**
 * Returns the current business date in YYYY-MM-DD format,
 * authoritative to the Asia/Dhaka timezone (UTC+6).
 */
export function getBusinessDate(): string {
  // Intl.DateTimeFormat with 'en-CA' locale produces YYYY-MM-DD format.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
