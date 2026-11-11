export const money = (amount: number, language: "en" | "pl" = "pl") =>
  language === "en"
    ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "PLN" }).format(
        amount,
      )
    : `${amount.toFixed(2).replace(".", ",")} zł`;

export function getArrivalTime(departure: string, durationMinutes: number) {
  const departureTime = new Date(`2000-01-01T${departure}`);
  return new Date(departureTime.getTime() + durationMinutes * 60_000)
    .toTimeString()
    .slice(0, 5);
}

export function hasDeparturePassed(date: string, departure: string) {
  const departureAt = new Date(`${date}T${departure}:00`);
  return !Number.isNaN(departureAt.getTime()) && departureAt.getTime() <= Date.now();
}

export function getLocalDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
