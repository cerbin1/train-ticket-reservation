import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { BookingRecord, Draft, Trip } from "./types";
import { getArrivalTime, getLocalDate, hasDeparturePassed, money } from "./utils";
import {
  isBookingHistory,
  isDraft,
  isFavoriteRoutes,
  isRecord,
  readStored,
  writeStored,
} from "./storage";
import { useLanguage } from "./i18n";

type SearchState = {
  from: string;
  to: string;
  date: string;
  searchCriteria: { from: string; to: string; date: string } | null;
  departureFrom: string;
  departureTo: string;
  maxPrice: string;
  maxDuration: string;
  transferCount: string;
  sort: string;
};

function isSearchState(value: unknown): value is SearchState {
  if (!isRecord(value)) return false;
  const criteria = value.searchCriteria;
  return (
    typeof value.from === "string" &&
    typeof value.to === "string" &&
    typeof value.date === "string" &&
    typeof value.departureFrom === "string" &&
    typeof value.departureTo === "string" &&
    typeof value.maxPrice === "string" &&
    typeof value.maxDuration === "string" &&
    ["any", "0", "1"].includes(String(value.transferCount)) &&
    ["depart", "price", "duration"].includes(String(value.sort)) &&
    (criteria === null ||
      (isRecord(criteria) &&
        typeof criteria.from === "string" &&
        typeof criteria.to === "string" &&
        typeof criteria.date === "string"))
  );
}

function normalizeCityName(value: string) {
  return value
    .toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .trim();
}

function CityCombobox({
  id,
  label,
  value,
  cities,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  cities: string[];
  onChange: (value: string) => void;
}) {
  const { tr } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedValue = normalizeCityName(value);
  const filteredCities = cities.filter((city) =>
    normalizeCityName(city).includes(normalizedValue),
  );
  const exactMatch = cities.some((city) => normalizeCityName(city) === normalizedValue);

  const selectCity = (city: string) => {
    onChange(city);
    setActiveIndex(-1);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        filteredCities.length ? (current + 1) % filteredCities.length : -1,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        filteredCities.length
          ? current <= 0
            ? filteredCities.length - 1
            : current - 1
          : -1,
      );
    } else if (event.key === "Enter" && isOpen && activeIndex >= 0) {
      event.preventDefault();
      selectCity(filteredCities[activeIndex]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="city-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={`${id}-suggestions`}
        aria-activedescendant={
          activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
        }
        aria-invalid={Boolean(value.trim()) && !exactMatch}
        aria-describedby={`${id}-message`}
        value={value}
        onFocus={() => {
          if (!exactMatch) setIsOpen(true);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setActiveIndex(-1);
          setIsOpen(true);
        }}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        required
      />
      {isOpen && (
        <div className="city-suggestions" id={`${id}-suggestions`} role="listbox">
          {filteredCities.length ? (
            filteredCities.map((city, index) => (
              <div
                id={`${id}-option-${index}`}
                key={city}
                role="option"
                aria-selected={activeIndex === index}
                className={activeIndex === index ? "active" : ""}
                onPointerDown={(event) => {
                  event.preventDefault();
                  selectCity(city);
                }}
              >
                {city}
              </div>
            ))
          ) : (
            <p className="city-no-results">
              {tr("Brak pasujących miast", "No matching cities")}
            </p>
          )}
        </div>
      )}
      <span className="city-message" id={`${id}-message`} aria-live="polite">
        {value.trim() && !exactMatch
          ? filteredCities.length
            ? tr("Wybierz miasto z podpowiedzi.", "Choose a city from the suggestions.")
            : tr("Nie znaleziono takiego miasta.", "No matching city was found.")
          : ""}
      </span>
    </div>
  );
}

export function Search({ cities, trips }: { cities: string[]; trips: Trip[] }) {
  const { language, tr } = useLanguage();
  const navigate = useNavigate();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [initialStoredSearch] = useState(() =>
    readStored("sessionStorage", "search", isSearchState),
  );
  const initialSearch = initialStoredSearch.value;
  const [favoriteRead] = useState(() =>
    readStored("localStorage", "favoriteRoutes", isFavoriteRoutes),
  );
  const [favorites, setFavorites] = useState(favoriteRead.value ?? []);
  const [favoriteError, setFavoriteError] = useState(favoriteRead.error);
  const [from, setFrom] = useState(initialSearch?.from ?? "Warszawa"),
    [to, setTo] = useState(initialSearch?.to ?? "Kraków"),
    [date, setDate] = useState(
      initialSearch?.date ?? new Date().toISOString().slice(0, 10),
    ),
    [searchCriteria, setSearchCriteria] = useState<{
      from: string;
      to: string;
      date: string;
    } | null>(initialSearch?.searchCriteria ?? null),
    [validationError, setValidationError] = useState(""),
    [departureError, setDepartureError] = useState(""),
    [departureFrom, setDepartureFrom] = useState(initialSearch?.departureFrom ?? ""),
    [departureTo, setDepartureTo] = useState(initialSearch?.departureTo ?? ""),
    [maxPrice, setMaxPrice] = useState(initialSearch?.maxPrice ?? ""),
    [maxDuration, setMaxDuration] = useState(initialSearch?.maxDuration ?? ""),
    [transferCount, setTransferCount] = useState(initialSearch?.transferCount ?? "any"),
    [sort, setSort] = useState(initialSearch?.sort ?? "depart"),
    [storageError, setStorageError] = useState(initialStoredSearch.error);
  useEffect(() => {
    const saved = writeStored("sessionStorage", "search", {
      from,
      to,
      date,
      searchCriteria,
      departureFrom,
      departureTo,
      maxPrice,
      maxDuration,
      transferCount,
      sort,
    });
    if (!saved) setStorageError(true);
  }, [
    from,
    to,
    date,
    searchCriteria,
    departureFrom,
    departureTo,
    maxPrice,
    maxDuration,
    transferCount,
    sort,
  ]);
  const matches = useMemo(() => {
    if (!searchCriteria) return [];
    return trips
      .filter(
        (t) =>
          t.from === searchCriteria.from &&
          t.to === searchCriteria.to &&
          t.days.includes(new Date(`${searchCriteria.date}T12:00:00`).getDay()) &&
          (!departureFrom || t.depart >= departureFrom) &&
          (!departureTo || t.depart <= departureTo) &&
          (!maxPrice || t.price <= Number(maxPrice)) &&
          (!maxDuration || t.duration <= Number(maxDuration)) &&
          (transferCount === "any" || t.transfers === Number(transferCount)),
      )
      .sort((a, b) =>
        sort === "price"
          ? a.price - b.price
          : sort === "duration"
            ? a.duration - b.duration
            : a.depart.localeCompare(b.depart),
      );
  }, [
    trips,
    searchCriteria,
    departureFrom,
    departureTo,
    maxPrice,
    maxDuration,
    transferCount,
    sort,
  ]);
  return (
    <>
      <section className="hero">
        <p className="eyebrow">{tr("DOBRY KIERUNEK", "A GOOD JOURNEY")}</p>
        <h1>
          {tr("Miasto za miastem.", "City after city.")}
          <br />
          <em>{tr("Bez pośpiechu.", "At your own pace.")}</em>
        </h1>
        <p className="lead">
          {tr(
            "Wybierz trasę, która pasuje do Twojego dnia.",
            "Find a train that fits your day.",
          )}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const findCity = (value: string) =>
              cities.find((city) => normalizeCityName(city) === normalizeCityName(value));
            const selectedFrom = findCity(from);
            const selectedTo = findCity(to);

            if (!selectedFrom || !selectedTo) {
              setSearchCriteria(null);
              setValidationError(
                tr(
                  "Wybierz miasta z listy podpowiedzi.",
                  "Choose cities from the suggestions.",
                ),
              );
              return;
            }

            if (selectedFrom === selectedTo) {
              setSearchCriteria(null);
              setValidationError(
                tr(
                  "Stacja początkowa i końcowa muszą być różne.",
                  "Departure and arrival cities must be different.",
                ),
              );
              return;
            }

            setFrom(selectedFrom);
            setTo(selectedTo);
            setValidationError("");
            setSearchCriteria({ from: selectedFrom, to: selectedTo, date });
          }}
        >
          <CityCombobox
            id="from-city"
            label={tr("Skąd", "From")}
            value={from}
            cities={cities}
            onChange={(value) => {
              setFrom(value);
              setValidationError("");
            }}
          />
          <CityCombobox
            id="to-city"
            label={tr("Dokąd", "To")}
            value={to}
            cities={cities}
            onChange={(value) => {
              setTo(value);
              setValidationError("");
            }}
          />
          <div className="date-field">
            <label htmlFor="travel-date">{tr("Kiedy", "Date")}</label>
            <div className="date-control">
              <input
                ref={dateInputRef}
                id="travel-date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <button
                className="date-picker-trigger"
                type="button"
                aria-label={tr("Otwórz kalendarz", "Open calendar")}
                onClick={() => {
                  const input = dateInputRef.current;
                  try {
                    input?.showPicker?.();
                  } catch {
                    input?.focus();
                  }
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3.5" y="5" width="17" height="16" rx="2" />
                  <path d="M7.5 3v4M16.5 3v4M4 9h16" />
                </svg>
              </button>
            </div>
          </div>
          <button className="button">{tr("Szukaj połączeń →", "Search trains →")}</button>
        </form>
        {validationError && (
          <p className="field-error" role="alert">
            {validationError}
          </p>
        )}
      </section>
      {(storageError || favoriteError) && (
        <p className="notice" role="status">
          {tr(
            "Nie udało się odczytać lub zapisać części danych w przeglądarce. Możesz kontynuować, ale zmiany mogą nie zostać zachowane.",
            "Some browser data could not be read or saved. You can continue, but changes may not be retained.",
          )}
        </p>
      )}
      <section className="results">
        <div className="section-head">
          <div>
            <h2>
              {tr("Połączenia", "Connections")}
              {searchCriteria && ` · ${searchCriteria.from} – ${searchCriteria.to}`}
            </h2>
          </div>
          <div className="filters">
            <label>
              {tr("Odjazd od", "Departure after")}
              <input
                type="time"
                value={departureFrom}
                onChange={(e) => setDepartureFrom(e.target.value)}
              />
            </label>
            <label>
              {tr("Odjazd do", "Departure before")}
              <input
                type="time"
                value={departureTo}
                onChange={(e) => setDepartureTo(e.target.value)}
              />
            </label>
            <label>
              {tr("Cena maksymalna", "Maximum price")}
              <input
                type="number"
                min="0"
                step="1"
                value={maxPrice}
                placeholder={tr("Bez limitu", "No limit")}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </label>
            <label>
              {tr("Czas podróży do", "Journey time up to")}
              <select
                value={maxDuration}
                onChange={(e) => setMaxDuration(e.target.value)}
              >
                <option value="">{tr("Dowolny", "Any")}</option>
                <option value="120">2 {tr("godz.", "hrs")}</option>
                <option value="180">3 {tr("godz.", "hrs")}</option>
                <option value="240">4 {tr("godz.", "hrs")}</option>
                <option value="360">6 {tr("godz.", "hrs")}</option>
              </select>
            </label>
            <label>
              {tr("Przesiadki", "Transfers")}
              <select
                value={transferCount}
                onChange={(e) => setTransferCount(e.target.value)}
              >
                <option value="any">{tr("Dowolna liczba", "Any")}</option>
                <option value="0">{tr("Bez przesiadek", "Direct only")}</option>
                <option value="1">{tr("1 przesiadka", "1 transfer")}</option>
              </select>
            </label>
            <label>
              {tr("Sortuj", "Sort by")}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="depart">{tr("Odjazd", "Departure")}</option>
                <option value="price">{tr("Cena", "Price")}</option>
                <option value="duration">{tr("Czas podróży", "Journey time")}</option>
              </select>
            </label>
          </div>
        </div>
        {!searchCriteria ? (
          <p className="empty">
            {tr(
              "Wpisz trasę i datę, a następnie wybierz „Szukaj połączeń”.",
              "Enter a route and date, then select “Search trains”.",
            )}
          </p>
        ) : matches.length ? (
          matches.map((t) => (
            <article
              className={`trip ${hasDeparturePassed(searchCriteria.date, t.depart) ? "trip-unavailable" : ""}`}
              key={t.id}
            >
              <div className="times">
                <b>{t.depart}</b>
                <span className="line" />
                <b>{getArrivalTime(t.depart, t.duration)}</b>
              </div>
              <div className="route">
                <b>{t.from}</b>
                <span>
                  {t.category} · {t.trainNumber} · {Math.floor(t.duration / 60)}{" "}
                  {tr("godz.", "h")} {t.duration % 60} {tr("min", "min")} ·{" "}
                  {t.transfers
                    ? tr("1 przesiadka", "1 transfer")
                    : tr("bezpośrednio", "direct")}
                </span>
                {hasDeparturePassed(searchCriteria.date, t.depart) && (
                  <strong className="unavailable-label">
                    {tr("Pociąg odjechał", "Train has departed")}
                  </strong>
                )}
                <b>{t.to}</b>
              </div>
              <div className="price">
                <b>{money(t.price, language)}</b>
                <small>{tr("od / os.", "from / person")}</small>
                <button
                  className="favorite-toggle"
                  type="button"
                  aria-pressed={favorites.some(
                    (route) => route.from === t.from && route.to === t.to,
                  )}
                  onClick={() => {
                    const isSaved = favorites.some(
                      (route) => route.from === t.from && route.to === t.to,
                    );
                    const updated = isSaved
                      ? favorites.filter(
                          (route) => route.from !== t.from || route.to !== t.to,
                        )
                      : [...favorites, { from: t.from, to: t.to }];
                    if (writeStored("localStorage", "favoriteRoutes", updated)) {
                      setFavorites(updated);
                    } else {
                      setFavoriteError(true);
                    }
                  }}
                >
                  {favorites.some((route) => route.from === t.from && route.to === t.to)
                    ? tr("★ Ulubiona trasa", "★ Favorite route")
                    : tr("☆ Zapisz trasę", "☆ Save route")}
                </button>
                <button
                  className="button"
                  disabled={hasDeparturePassed(searchCriteria.date, t.depart)}
                  onClick={() => {
                    if (hasDeparturePassed(searchCriteria.date, t.depart)) {
                      setDepartureError(
                        tr(
                          "Ten pociąg już odjechał. Wybierz inny kurs.",
                          "This train has departed. Choose another service.",
                        ),
                      );
                      return;
                    }
                    writeStored("sessionStorage", "selectedTripId", t.id);
                    writeStored(
                      "sessionStorage",
                      "selectedTripDate",
                      searchCriteria.date,
                    );
                    navigate(`/trip/${t.id}`);
                  }}
                >
                  {tr("Szczegóły →", "Details →")}
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="empty">
            {tr(
              "Brak połączeń dla wybranej trasy i daty.",
              "No trains found for this route and date.",
            )}
          </p>
        )}
        {departureError && (
          <p className="field-error" role="alert">
            {departureError}
          </p>
        )}
      </section>
    </>
  );
}
export function Details({ trips }: { trips: Trip[] }) {
  const { language, tr } = useLanguage();
  const { id } = useParams(),
    t = trips.find((x) => x.id === id),
    nav = useNavigate();
  if (!t)
    return (
      <p className="notice">{tr("Nie znaleziono połączenia.", "Train not found.")}</p>
    );
  return (
    <section className="panel">
      <Link to="/">{tr("← Wróć do wyników", "← Back to results")}</Link>
      <p className="eyebrow">{tr("SZCZEGÓŁY PODRÓŻY", "JOURNEY DETAILS")}</p>
      <h1>
        {t.from}
        <br />
        <em>
          {tr("do", "to")} {t.to}
        </em>
      </h1>
      <div className="detail-grid">
        <div>
          <small>{tr("ODJAZD", "DEPARTURE")}</small>
          <h2>{t.depart}</h2>
          {t.from}
        </div>
        <div>
          <small>{tr("PRZYJAZD", "ARRIVAL")}</small>
          <h2>{getArrivalTime(t.depart, t.duration)}</h2>
          {t.to}
        </div>
        <div>
          <small>{tr("CZAS", "DURATION")}</small>
          <h2>
            {Math.floor(t.duration / 60)}h {t.duration % 60}m
          </h2>
          {t.transfers ? tr("1 przesiadka", "1 transfer") : tr("bezpośrednio", "direct")}
        </div>
      </div>
      <h3>{tr("Przebieg trasy", "Route itinerary")}</h3>
      <p className="train-meta">
        {t.category} · {t.trainNumber} · {t.operator}
      </p>
      <ol className="route-timeline">
        {t.stops.map((stop) => (
          <li className="timeline-stop" key={stop.station}>
            <span className="timeline-marker" aria-hidden="true" />
            <div className="timeline-content">
              <h4>{stop.station}</h4>
              <div className="stop-times">
                {stop.arrival && (
                  <p>
                    <span>{tr("Przyjazd", "Arrival")}</span>
                    <time>{stop.arrival}</time>
                    {stop.arrivalPlatform && (
                      <small>
                        {tr("Peron", "Platform")} {stop.arrivalPlatform}
                      </small>
                    )}
                  </p>
                )}
                {stop.departure && (
                  <p>
                    <span>{tr("Odjazd", "Departure")}</span>
                    <time>{stop.departure}</time>
                    {stop.departurePlatform && (
                      <small>
                        {tr("Peron", "Platform")} {stop.departurePlatform}
                      </small>
                    )}
                  </p>
                )}
              </div>
              {stop.transferMinutes > 0 && (
                <p className="transfer-note">
                  {tr("Przesiadka", "Transfer")} · {stop.transferMinutes}{" "}
                  {tr("min", "min")}
                  {stop.arrivalPlatform && stop.departurePlatform && (
                    <>
                      {" "}
                      · {tr("peron", "platform")} {stop.arrivalPlatform} →{" "}
                      {tr("peron", "platform")} {stop.departurePlatform}
                    </>
                  )}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      <h3>{tr("Udogodnienia", "Amenities")}</h3>
      <p>
        {t.amenities
          .map((item) =>
            item === "Gniazdka"
              ? tr(item, "Power outlets")
              : item === "Wagon restauracyjny"
                ? tr(item, "Dining car")
                : item,
          )
          .join(" · ")}
      </p>
      <p className="notice">
        {tr(
          "Przykładowy rozkład i ceny. Rezerwacja demonstracyjna.",
          "Sample timetable and fares. Booking demonstration.",
        )}
      </p>
      <button
        className="button"
        onClick={() => {
          writeStored("sessionStorage", "selectedTripId", t.id);
          nav("/booking");
        }}
      >
        {tr("Wybierz połączenie · od", "Select train · from")} {money(t.price, language)}{" "}
        →
      </button>
    </section>
  );
}
export function Booking({ trips }: { trips: Trip[] }) {
  const { language, tr } = useLanguage();
  const [storedTrip] = useState(() =>
      readStored(
        "sessionStorage",
        "selectedTripId",
        (value): value is string => typeof value === "string",
      ),
    ),
    [tripDate] = useState(() =>
      readStored(
        "sessionStorage",
        "selectedTripDate",
        (value): value is string =>
          typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
      ),
    ),
    [storedDraft] = useState(() => readStored("sessionStorage", "draft", isDraft)),
    [bookingHistory] = useState(() =>
      readStored("localStorage", "bookings", isBookingHistory),
    ),
    t = trips.find((x) => x.id === storedTrip.value),
    initialDraft =
      storedDraft.value &&
      storedDraft.value.tripId === t?.id &&
      storedDraft.value.date === tripDate.value
        ? storedDraft.value
        : null,
    nav = useNavigate(),
    [klass, setKlass] = useState(initialDraft?.klass ?? "2 klasa"),
    [normal, setNormal] = useState(initialDraft?.normal ?? 1),
    [reduced, setReduced] = useState(initialDraft?.reduced ?? 0),
    [seats, setSeats] = useState(initialDraft?.seats ?? []),
    [storageError, setStorageError] = useState(
      storedTrip.error || tripDate.error || storedDraft.error || bookingHistory.error,
    ),
    [departureError, setDepartureError] = useState(""),
    [seatError, setSeatError] = useState("");
  const total = t
    ? (normal + reduced * 0.5) * t.price * (klass === "1 klasa" ? 1.45 : 1)
    : 0;
  const passengerCount = normal + reduced;
  const occupiedSeats =
    t && tripDate.value
      ? (bookingHistory.value ?? [])
          .filter(
            (booking) => booking.trip.id === t.id && booking.date === tripDate.value,
          )
          .flatMap((booking) => booking.seats ?? [])
      : [];
  useEffect(() => {
    if (!t || !tripDate.value) return;
    if (
      !writeStored("sessionStorage", "draft", {
        tripId: t.id,
        date: tripDate.value,
        klass,
        normal,
        reduced,
        total,
        seats,
      })
    ) {
      setStorageError(true);
    }
  }, [t, tripDate.value, klass, normal, reduced, total, seats]);
  if (!t || !tripDate.value)
    return (
      <section className="panel">
        <p className="notice">
          {tr(
            "Nie znaleziono wybranego połączenia. Wybierz je ponownie z listy.",
            "The selected train could not be found. Choose it again from the list.",
          )}
        </p>
        <Link to="/">{tr("Wróć do wyszukiwarki", "Back to search")}</Link>
      </section>
    );
  if (hasDeparturePassed(tripDate.value, t.depart))
    return (
      <section className="panel">
        <p className="field-error" role="alert">
          {tr(
            "Ten pociąg już odjechał. Nie można kupić biletu na ten kurs.",
            "This train has departed. Tickets are no longer available for this service.",
          )}
        </p>
        <Link to="/">{tr("Wybierz inny pociąg", "Choose another train")}</Link>
      </section>
    );
  return (
    <section className="panel">
      {storageError && (
        <p className="notice" role="status">
          {tr(
            "Nie udało się odczytać lub zapisać rezerwacji. Możesz kontynuować bez zapisywania zmian.",
            "The booking could not be read or saved. You can continue, but changes may not be retained.",
          )}
        </p>
      )}
      <Link to={`/trip/${t.id}`}>{tr("← Szczegóły połączenia", "← Train details")}</Link>
      <p className="eyebrow">{tr("REZERWACJA", "BOOKING")}</p>
      <h1>{tr("Skład podróży", "Your passengers")}</h1>
      <p>
        {t.from} → {t.to} · {t.depart}
      </p>
      {departureError && (
        <p className="field-error" role="alert">
          {departureError}
        </p>
      )}
      <div className="choice">
        <label>
          {tr("Klasa", "Class")}
          <select value={klass} onChange={(e) => setKlass(e.target.value)}>
            <option value="2 klasa">{tr("2 klasa", "2nd class")}</option>
            <option value="1 klasa">{tr("1 klasa", "1st class")}</option>
          </select>
        </label>
        <label>
          {tr("Bilety normalne", "Adult tickets")}
          <select
            value={normal}
            onChange={(e) => {
              const nextNormal = +e.target.value;
              setNormal(nextNormal);
              setSeats((current) => current.slice(0, nextNormal + reduced));
              setSeatError("");
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          {tr("Bilety ulgowe", "Reduced-fare tickets")}
          <select
            value={reduced}
            onChange={(e) => {
              const nextReduced = +e.target.value;
              setReduced(nextReduced);
              setSeats((current) => current.slice(0, normal + nextReduced));
              setSeatError("");
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <section className="seat-picker" aria-labelledby="seat-picker-title">
        <div className="seat-picker-heading">
          <div>
            <h2 id="seat-picker-title">{tr("Wybierz miejsca", "Choose seats")}</h2>
            <p>
              {tr(
                "Wybierz jedno miejsce dla każdego pasażera.",
                "Choose one seat for each passenger.",
              )}
            </p>
            <p className="seat-change-hint">
              {tr(
                "Aby zmienić wybór, kliknij inne wolne miejsce.",
                "To change your selection, click another available seat.",
              )}
            </p>
          </div>
          <span>
            {tr("Wybrano", "Selected")} {seats.length} {tr("z", "of")} {passengerCount}
          </span>
        </div>
        {seatError && (
          <p className="field-error" role="alert">
            {seatError}
          </p>
        )}
        <div className="seat-legend" aria-label={tr("Legenda miejsc", "Seat legend")}>
          <span>
            <i className="seat-sample" /> {tr("Wolne", "Available")}
          </span>
          <span>
            <i className="seat-sample selected" /> {tr("Wybrane", "Selected")}
          </span>
          <span>
            <i className="seat-sample occupied" /> {tr("Zajęte", "Occupied")}
          </span>
        </div>
        <div
          className="seat-map"
          aria-label={tr("Układ wagonu, 24 miejsca", "Carriage layout, 24 seats")}
        >
          {Array.from({ length: 24 }, (_, index) => {
            const seat = `${Math.floor(index / 4) + 1}${String.fromCharCode(65 + (index % 4))}`;
            const occupied = occupiedSeats.includes(seat);
            const selected = seats.includes(seat);
            return (
              <button
                type="button"
                key={seat}
                className={`seat ${selected ? "selected" : ""} ${occupied ? "occupied" : ""}`}
                aria-label={`${tr("Miejsce", "Seat")} ${seat}${occupied ? `, ${tr("zajęte", "occupied")}` : selected ? `, ${tr("wybrane", "selected")}` : `, ${tr("wolne", "available")}`}`}
                aria-pressed={selected}
                disabled={occupied || passengerCount === 0}
                onClick={() => {
                  setSeatError("");
                  setSeats((current) => {
                    if (current.includes(seat)) {
                      return current.filter((selectedSeat) => selectedSeat !== seat);
                    }
                    if (current.length >= passengerCount) {
                      return [...current.slice(0, passengerCount - 1), seat];
                    }
                    return [...current, seat];
                  });
                }}
              >
                {seat}
              </button>
            );
          })}
        </div>
      </section>
      <p className="total">
        {tr("Suma", "Total")} <b>{money(total, language)}</b>
      </p>
      <button
        disabled={!passengerCount || seats.length !== passengerCount}
        className="button"
        onClick={() => {
          if (hasDeparturePassed(tripDate.value!, t.depart)) {
            setDepartureError(
              tr(
                "Ten pociąg już odjechał. Nie można kupić biletu.",
                "This train has departed. Tickets can no longer be purchased.",
              ),
            );
            return;
          }
          if (seats.length !== passengerCount) {
            setSeatError(
              `${tr("Wybierz dokładnie", "Select exactly")} ${passengerCount} ${tr("miejsc.", "seat(s).")}`,
            );
            return;
          }
          nav("/summary");
        }}
      >
        {tr("Podsumowanie →", "Review booking →")}
      </button>
    </section>
  );
}
export function Summary({ trips }: { trips: Trip[] }) {
  const { language, tr } = useLanguage();
  const [draftRead] = useState(() => readStored("sessionStorage", "draft", isDraft));
  const [bookingHistory] = useState(() =>
    readStored("localStorage", "bookings", isBookingHistory),
  );
  const d = draftRead.value as Draft | null;
  const t = trips.find((x) => x.id === d?.tripId);
  const priorConfirmation = bookingHistory.value?.find(
    (booking) =>
      Boolean(booking.confirmationNumber) &&
      booking.trip.id === d?.tripId &&
      booking.date === d?.date &&
      booking.klass === d?.klass &&
      booking.normal === d?.normal &&
      booking.reduced === d?.reduced &&
      JSON.stringify(booking.seats ?? []) === JSON.stringify(d?.seats ?? []),
  );
  const [confirmation, setConfirmation] = useState<BookingRecord | null>(
    priorConfirmation ?? null,
  );
  const [storageError, setStorageError] = useState(
    draftRead.error || bookingHistory.error,
  );
  const [departureError, setDepartureError] = useState("");
  const [seatError, setSeatError] = useState("");
  if (!d || !t)
    return (
      <section className="panel">
        <p className="notice" role="status">
          {tr(
            "Nie znaleziono zapisanej rezerwacji. Wybierz połączenie i bilety ponownie.",
            "No saved booking was found. Select a train and tickets again.",
          )}
        </p>
        <Link to="/">{tr("Wróć do wyszukiwarki", "Back to search")}</Link>
      </section>
    );
  if (confirmation)
    return (
      <section className="panel confirmation" id="booking-confirmation">
        <p className="eyebrow">{tr("REZERWACJA POTWIERDZONA", "BOOKING CONFIRMED")}</p>
        <h1>{tr("Miłej podróży!", "Have a great journey!")}</h1>
        <p className="confirmation-reference">
          {tr("Numer rezerwacji", "Booking reference")}{" "}
          <strong>{confirmation.confirmationNumber}</strong>
        </p>
        <div className="receipt-details">
          <p className="receipt-route">
            {t.from} <span>→</span> {t.to}
          </p>
          <p>
            {t.trainNumber} · {t.category} · {t.operator}
          </p>
          <p>
            {d.date} · {t.depart} ·{" "}
            {tr(d.klass, d.klass === "1 klasa" ? "1st class" : "2nd class")}
          </p>
          <p>
            {tr("Pasażerowie", "Passengers")}: {d.normal} {tr("normalne", "adult")},{" "}
            {d.reduced} {tr("ulgowe", "reduced fare")}
          </p>
          <p>
            {tr("Miejsca", "Seats")}:{" "}
            {d.seats?.join(", ") || tr("Nie wybrano", "None selected")}
          </p>
          <p className="receipt-total">
            {tr("Łącznie", "Total")}: {money(d.total, language)}
          </p>
          <p>
            {tr("Potwierdzono", "Confirmed")}:{" "}
            {new Date(confirmation.createdAt).toLocaleString(
              language === "en" ? "en-GB" : "pl-PL",
            )}
          </p>
        </div>
        {storageError && (
          <p className="notice" role="status">
            {tr(
              "Potwierdzenie jest dostępne teraz, ale nie udało się zapisać go w historii.",
              "Your confirmation is available, but could not be saved to your booking history.",
            )}
          </p>
        )}
        <div className="receipt-actions no-print">
          <button className="button" onClick={() => window.print()}>
            {tr("Drukuj potwierdzenie", "Print confirmation")}
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              const receipt = [
                tr("POTWIERDZENIE REZERWACJI", "BOOKING CONFIRMATION"),
                `${tr("Numer rezerwacji", "Booking reference")}: ${confirmation.confirmationNumber}`,
                `${tr("Trasa", "Route")}: ${t.from} – ${t.to}`,
                `${tr("Pociąg", "Train")}: ${t.trainNumber} (${t.category})`,
                `${tr("Data i odjazd", "Date and departure")}: ${d.date}, ${t.depart}`,
                `${tr("Klasa", "Class")}: ${tr(d.klass, d.klass === "1 klasa" ? "1st class" : "2nd class")}`,
                `${tr("Bilety", "Tickets")}: ${d.normal} ${tr("normalne", "adult")}, ${d.reduced} ${tr("ulgowe", "reduced fare")}`,
                `${tr("Miejsca", "Seats")}: ${d.seats?.join(", ") || tr("Nie wybrano", "None selected")}`,
                `${tr("Suma", "Total")}: ${money(d.total, language)}`,
                `${tr("Potwierdzono", "Confirmed")}: ${new Date(confirmation.createdAt).toLocaleString(language === "en" ? "en-GB" : "pl-PL")}`,
              ].join("\n");
              const url = URL.createObjectURL(
                new Blob([receipt], { type: "text/plain;charset=utf-8" }),
              );
              const link = document.createElement("a");
              link.href = url;
              link.download = `${language === "en" ? "booking-confirmation" : "potwierdzenie"}-${confirmation.confirmationNumber}.txt`;
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            {tr("Pobierz potwierdzenie", "Download confirmation")}
          </button>
        </div>
        <Link className="no-print" to="/">
          {tr("Wróć do wyszukiwarki", "Back to search")}
        </Link>
      </section>
    );
  return (
    <section className="panel">
      <Link to="/booking">{tr("← Zmień bilety", "← Change tickets")}</Link>
      <p className="eyebrow">{tr("PODSUMOWANIE", "BOOKING SUMMARY")}</p>
      <h1>{tr("Gotowi do drogi?", "Ready to go?")}</h1>
      {(departureError || hasDeparturePassed(d.date, t.depart)) && (
        <p className="field-error" role="alert">
          {departureError ||
            tr(
              "Ten pociąg już odjechał. Nie można kupić biletu.",
              "This train has departed. Tickets can no longer be purchased.",
            )}
        </p>
      )}
      {storageError && (
        <p className="notice" role="status">
          {tr(
            "Nie udało się odczytać lub zapisać rezerwacji w przeglądarce.",
            "The booking could not be read or saved in your browser.",
          )}
        </p>
      )}
      {seatError && (
        <p className="field-error" role="alert">
          {seatError}
        </p>
      )}
      <div className="summary">
        <p>
          {t.from} → {t.to}
        </p>
        <p>
          {d.date} · {t.depart} ·{" "}
          {tr(d.klass, d.klass === "1 klasa" ? "1st class" : "2nd class")}
        </p>
        <p>
          {tr("Bilety normalne", "Adult tickets")}: {d.normal} ·{" "}
          {tr("ulgowe", "reduced fare")}: {d.reduced}
        </p>
        <p>
          {tr("Miejsca", "Seats")}:{" "}
          {d.seats?.join(", ") || tr("Nie wybrano", "None selected")}
        </p>
        <h2>
          {tr("Suma", "Total")} <b>{money(d.total, language)}</b>
        </h2>
      </div>
      <button
        className="button"
        disabled={hasDeparturePassed(d.date, t.depart)}
        onClick={() => {
          if (hasDeparturePassed(d.date, t.depart)) {
            setDepartureError(
              tr(
                "Ten pociąg już odjechał. Nie można kupić biletu.",
                "This train has departed. Tickets can no longer be purchased.",
              ),
            );
            return;
          }
          const existing = readStored("localStorage", "bookings", isBookingHistory);
          const list = existing.value ?? [];
          const seatsAlreadyTaken = list.some(
            (booking) =>
              booking.trip.id === t.id &&
              booking.date === d.date &&
              (booking.seats ?? []).some((seat) => (d.seats ?? []).includes(seat)),
          );
          if (seatsAlreadyTaken) {
            setSeatError(
              tr(
                "Wybrane miejsce zostało już zajęte. Wróć i wybierz inne.",
                "That seat has just been taken. Go back and choose another one.",
              ),
            );
            return;
          }
          const confirmed: BookingRecord = {
            ...d,
            trip: t,
            createdAt: new Date().toISOString(),
            confirmationNumber: `PER-${getLocalDate().replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
          };
          list.unshift(confirmed);
          const saved = writeStored("localStorage", "bookings", list);
          setStorageError(existing.error || !saved);
          setConfirmation(confirmed);
        }}
      >
        {tr("Potwierdź rezerwację →", "Confirm booking →")}
      </button>
    </section>
  );
}

export function SavedTrips() {
  const { language, tr } = useLanguage();
  const navigate = useNavigate();
  const [favoriteRead] = useState(() =>
    readStored("localStorage", "favoriteRoutes", isFavoriteRoutes),
  );
  const [bookingRead] = useState(() =>
    readStored("localStorage", "bookings", isBookingHistory),
  );
  const [favorites, setFavorites] = useState(favoriteRead.value ?? []);
  const [bookings] = useState(bookingRead.value ?? []);
  const [storageError, setStorageError] = useState(
    favoriteRead.error || bookingRead.error,
  );

  const searchAgain = (from: string, to: string) => {
    const date = getLocalDate();
    const search = {
      from,
      to,
      date,
      searchCriteria: { from, to, date },
      departureFrom: "",
      departureTo: "",
      maxPrice: "",
      maxDuration: "",
      transferCount: "any",
      sort: "depart",
    };
    if (writeStored("sessionStorage", "search", search)) {
      navigate("/");
    } else {
      setStorageError(true);
    }
  };

  const removeFavorite = (from: string, to: string) => {
    const updated = favorites.filter((route) => route.from !== from || route.to !== to);
    if (writeStored("localStorage", "favoriteRoutes", updated)) {
      setFavorites(updated);
    } else {
      setStorageError(true);
    }
  };

  return (
    <section className="saved-page">
      <p className="eyebrow">{tr("TWOJE PODRÓŻE", "YOUR TRIPS")}</p>
      <h1>{tr("Ulubione i rezerwacje", "Favorites and bookings")}</h1>
      {storageError && (
        <p className="notice" role="status">
          {tr(
            "Nie udało się odczytać lub zapisać danych. Spróbuj ponownie później.",
            "Some data could not be read or saved. Please try again later.",
          )}
        </p>
      )}
      <section className="saved-section">
        <h2>{tr("Ulubione trasy", "Favorite routes")}</h2>
        {favorites.length ? (
          favorites.map((route) => (
            <article className="saved-row" key={`${route.from}-${route.to}`}>
              <strong>
                {route.from} → {route.to}
              </strong>
              <div>
                <button
                  className="button"
                  onClick={() => searchAgain(route.from, route.to)}
                >
                  {tr("Szukaj ponownie", "Search again")}
                </button>
                <button
                  className="text-button"
                  onClick={() => removeFavorite(route.from, route.to)}
                >
                  {tr("Usuń", "Remove")}
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="empty">
            {tr("Nie masz jeszcze zapisanych tras.", "You have no saved routes yet.")}
          </p>
        )}
      </section>
      <section className="saved-section">
        <h2>{tr("Historia rezerwacji", "Booking history")}</h2>
        {bookings.length ? (
          bookings.map((booking) => (
            <article
              className="saved-row"
              key={`${booking.createdAt}-${booking.trip.id}`}
            >
              <div>
                <strong>
                  {booking.trip.from} → {booking.trip.to}
                </strong>
                <p>
                  {booking.date} · {booking.trip.depart} ·{" "}
                  {money(booking.total, language)}
                </p>
              </div>
              <button
                className="button"
                onClick={() => searchAgain(booking.trip.from, booking.trip.to)}
              >
                {tr("Szukaj ponownie", "Search again")}
              </button>
            </article>
          ))
        ) : (
          <p className="empty">
            {tr("Nie masz jeszcze rezerwacji.", "You have no bookings yet.")}
          </p>
        )}
      </section>
    </section>
  );
}
