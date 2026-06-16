/**
 * Formats two dates into a clean, human-readable range.
 * Supports Date objects, ISO strings, or millisecond timestamps.
 */
export function formatDateRange(
  start?: string | null,
  end?: string | null,
): string {
  if (!start || !end) return "";
  const startDate = new Date(start);
  const endDate = new Date(end);

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return "Invalid Date";
  }

  // Extract date components
  const startDay: number = startDate.getDate();
  const endDay: number = endDate.getDate();

  // "short" gives 3-letter month representation (JAN, FEB, etc.)
  const startMonth: string = startDate
    .toLocaleString("en-US", { month: "short" })
    .toUpperCase();
  const endMonth: string = endDate
    .toLocaleString("en-US", { month: "short" })
    .toUpperCase();

  const startYear: number = startDate.getFullYear();
  const endYear: number = endDate.getFullYear();

  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay}-${endDay} ${startMonth} ${startYear}`;
  }

  if (startYear === endYear) {
    return `${startDay} ${startMonth}-${endDay} ${endMonth} ${startYear}`;
  }

  return `${startDay} ${startMonth} ${startYear}-${endDay} ${endMonth} ${endYear}`;
}
