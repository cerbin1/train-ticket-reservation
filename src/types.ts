export type Trip = {
  id: string;
  from: string;
  to: string;
  days: number[];
  depart: string;
  duration: number;
  transfers: number;
  stops: Stop[];
  price: number;
  category: "IC" | "EIC" | "TLK";
  trainNumber: string;
  operator: string;
  amenities: string[];
};

export type Stop = {
  station: string;
  arrival: string | null;
  departure: string | null;
  arrivalPlatform: string | null;
  departurePlatform: string | null;
  transferMinutes: number;
};

export type Draft = {
  tripId: string;
  date: string;
  klass: string;
  normal: number;
  reduced: number;
  total: number;
  seats?: string[];
};

export type FavoriteRoute = {
  from: string;
  to: string;
};

export type BookingRecord = Draft & {
  trip: Trip;
  createdAt: string;
  confirmationNumber?: string;
};
