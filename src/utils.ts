export const money = (amount: number) => `${amount.toFixed(2).replace(".", ",")} zł`;

export function getArrivalTime(departure: string, durationMinutes: number) {
  const departureTime = new Date(`2000-01-01T${departure}`);
  return new Date(departureTime.getTime() + durationMinutes * 60_000)
    .toTimeString()
    .slice(0, 5);
}
