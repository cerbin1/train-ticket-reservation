export type Trip = {
  id: string;
  from: string;
  to: string;
  days: number[];
  depart: string;
  duration: number;
  transfers: number;
  stops: string[];
  price: number;
};

export type Draft = {
  tripId: string;
  klass: string;
  normal: number;
  reduced: number;
  total: number;
};
