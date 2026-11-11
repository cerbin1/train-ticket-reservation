import type { BookingRecord, FavoriteRoute } from "./types";

type StoreName = "sessionStorage" | "localStorage";

export function readStored<T>(
  storeName: StoreName,
  key: string,
  isValid: (value: unknown) => value is T,
): { value: T | null; error: boolean } {
  try {
    const raw = window[storeName].getItem(key);
    if (raw === null) return { value: null, error: false };

    const value: unknown = JSON.parse(raw);
    if (isValid(value)) return { value, error: false };

    window[storeName].removeItem(key);
    return { value: null, error: true };
  } catch {
    try {
      window[storeName].removeItem(key);
    } catch {
      // Storage can be disabled by the browser; keep the app usable in memory.
    }
    return { value: null, error: true };
  }
}

export function writeStored(storeName: StoreName, key: string, value: unknown) {
  try {
    window[storeName].setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFavoriteRoutes(value: unknown): value is FavoriteRoute[] {
  return (
    Array.isArray(value) &&
    value.every(
      (route) =>
        isRecord(route) &&
        typeof route.from === "string" &&
        typeof route.to === "string" &&
        route.from !== route.to,
    )
  );
}

export function isBookingHistory(value: unknown): value is BookingRecord[] {
  return Array.isArray(value) && value.every(isBookingRecord);
}

function isBookingRecord(value: unknown): value is BookingRecord {
  if (!isRecord(value) || !isDraft(value)) return false;
  const record = value as Record<string, unknown>;
  const trip = record.trip;
  return (
    typeof record.createdAt === "string" &&
    (record.confirmationNumber === undefined ||
      typeof record.confirmationNumber === "string") &&
    isRecord(trip) &&
    typeof trip.id === "string" &&
    typeof trip.from === "string" &&
    typeof trip.to === "string" &&
    typeof trip.depart === "string"
  );
}

export function isDraft(value: unknown): value is {
  tripId: string;
  date: string;
  klass: string;
  normal: number;
  reduced: number;
  total: number;
  seats?: string[];
} {
  return (
    isRecord(value) &&
    typeof value.tripId === "string" &&
    typeof value.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    (value.klass === "1 klasa" || value.klass === "2 klasa") &&
    typeof value.normal === "number" &&
    Number.isInteger(value.normal) &&
    typeof value.reduced === "number" &&
    Number.isInteger(value.reduced) &&
    typeof value.total === "number" &&
    Number.isFinite(value.total) &&
    (value.seats === undefined ||
      (Array.isArray(value.seats) &&
        value.seats.every((seat) => typeof seat === "string"))) &&
    value.normal >= 0 &&
    value.reduced >= 0
  );
}
