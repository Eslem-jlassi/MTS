type DateLike = string | number | Date | null | undefined;

const DEFAULT_LOCALE = "fr-FR";
const EMPTY_VALUE = "—";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const toDate = (value: DateLike): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatNumber = (
  value: number,
  options?: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  },
): string =>
  new Intl.NumberFormat(DEFAULT_LOCALE, {
    maximumFractionDigits: options?.maximumFractionDigits ?? 1,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
  }).format(value);

export const formatDateTime = (
  value: DateLike,
  options?: {
    includeSeconds?: boolean;
  },
): string => {
  const date = toDate(value);
  if (!date) return EMPTY_VALUE;

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(options?.includeSeconds ? { second: "2-digit" } : {}),
  }).format(date);
};

export const formatDate = (value: DateLike): string => {
  const date = toDate(value);
  if (!date) return EMPTY_VALUE;

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const formatDateDayMonth = (value: DateLike): string => {
  const date = toDate(value);
  if (!date) return EMPTY_VALUE;

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
};

export const formatTime = (value: DateLike): string => {
  const date = toDate(value);
  if (!date) return EMPTY_VALUE;

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatRelativeTime = (value: DateLike): string => {
  const date = toDate(value);
  if (!date) return EMPTY_VALUE;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} j`;

  return formatDateTime(date);
};

export const formatPercent = (
  value: number | null | undefined,
  options?: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    signed?: boolean;
  },
): string => {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;

  const absoluteValue = Math.abs(value);
  const formattedValue = formatNumber(absoluteValue, {
    maximumFractionDigits: options?.maximumFractionDigits ?? 1,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
  });
  const sign = options?.signed && value > 0 ? "+" : value < 0 ? "-" : "";

  return `${sign}${formattedValue} %`;
};

export const formatHours = (
  value: number | null | undefined,
  options?: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  },
): string => {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;

  return `${formatNumber(value, {
    maximumFractionDigits: options?.maximumFractionDigits ?? 1,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
  })} h`;
};

export const formatDurationMinutes = (
  value: number | null | undefined,
  options?: {
    alwaysIncludeMinutes?: boolean;
    allowNegative?: boolean;
  },
): string => {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;

  const roundedValue = Math.round(value);
  const absoluteValue = Math.abs(roundedValue);
  const hours = Math.floor(absoluteValue / 60);
  const minutes = absoluteValue % 60;
  const prefix = roundedValue < 0 && options?.allowNegative ? "-" : "";

  if (hours === 0) return `${prefix}${minutes} min`;
  if (minutes === 0 && !options?.alwaysIncludeMinutes) return `${prefix}${hours} h`;

  return `${prefix}${hours} h ${minutes.toString().padStart(2, "0")} min`;
};

export const formatSlaRemaining = (value: number | null | undefined): string => {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;

  if (value < 0) {
    return `Dépassé de ${formatDurationMinutes(Math.abs(value), {
      alwaysIncludeMinutes: true,
    })}`;
  }

  return formatDurationMinutes(value, { alwaysIncludeMinutes: true });
};

export const formatDateRange = (start: DateLike, end: DateLike, separator = " - "): string => {
  const formattedStart = formatDate(start);
  const formattedEnd = formatDate(end);

  if (formattedStart === EMPTY_VALUE && formattedEnd === EMPTY_VALUE) return EMPTY_VALUE;
  if (formattedStart === EMPTY_VALUE) return formattedEnd;
  if (formattedEnd === EMPTY_VALUE) return formattedStart;

  return `${formattedStart}${separator}${formattedEnd}`;
};

export const formatFileSize = (bytes: number | null | undefined): string => {
  if (!isFiniteNumber(bytes) || bytes < 0) return EMPTY_VALUE;

  if (bytes < 1024) return `${formatNumber(bytes, { maximumFractionDigits: 0 })} o`;
  if (bytes < 1024 * 1024) {
    return `${formatNumber(bytes / 1024, { maximumFractionDigits: 1 })} Ko`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${formatNumber(bytes / (1024 * 1024), { maximumFractionDigits: 1 })} Mo`;
  }

  return `${formatNumber(bytes / (1024 * 1024 * 1024), { maximumFractionDigits: 1 })} Go`;
};

export const formatNumberValue = (
  value: number | null | undefined,
  options?: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  },
): string => {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;

  return formatNumber(value, options);
};
