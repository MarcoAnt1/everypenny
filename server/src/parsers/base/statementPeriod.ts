// Shared year-resolution helpers for PDF statements whose transaction rows carry
// only "Mon DD" (no year). We take the year from the statement's end date and,
// if assuming that year pushes a row past the statement end, roll it back one
// year — which correctly handles statements that span a year boundary (Dec -> Jan).

export type StatementPeriod = {
  endYear: number;
  endDate: Date;
};

// Extract the statement period from the PDF text using a bank-specific regex whose
// second capture group is the fully-dated end (e.g. "Jun 15, 2026").
export function resolvePeriod(
  text: string,
  periodRe: RegExp,
): StatementPeriod | null {
  const match = text.match(periodRe);
  if (!match?.[2]) return null;

  const endDate = new Date(match[2]);
  if (isNaN(endDate.getTime())) return null;

  return { endYear: endDate.getFullYear(), endDate };
}

// Resolve a bare "Mon DD" string to a full ISO date using the period. Falls back
// to the current year when no period was found.
export function resolveYear(
  txDateRaw: string,
  period: StatementPeriod | null,
): string | null {
  const year = period ? period.endYear : new Date().getFullYear();

  let date = new Date(`${txDateRaw} ${year}`);
  if (isNaN(date.getTime())) return null;

  // A row later than the statement end belongs to the previous year.
  if (period && date.getTime() > period.endDate.getTime()) {
    date = new Date(`${txDateRaw} ${year - 1}`);
    if (isNaN(date.getTime())) return null;
  }

  return date.toISOString();
}
