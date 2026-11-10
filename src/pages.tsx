import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Draft, Trip } from "./types";
import { getArrivalTime, money } from "./utils";

export function Search({ cities, trips }: { cities: string[]; trips: Trip[] }) {
  const navigate = useNavigate(),
    [from, setFrom] = useState("Warszawa"),
    [to, setTo] = useState("Kraków"),
    [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [searchCriteria, setSearchCriteria] = useState<{
      from: string;
      to: string;
      date: string;
    } | null>(null),
    [direct, setDirect] = useState(false),
    [sort, setSort] = useState("depart");
  const matches = useMemo(() => {
    if (!searchCriteria) return [];
    return trips
      .filter(
        (t) =>
          t.from === searchCriteria.from &&
          t.to === searchCriteria.to &&
          t.days.includes(new Date(`${searchCriteria.date}T12:00:00`).getDay()) &&
          (!direct || !t.transfers),
      )
      .sort((a, b) =>
        sort === "price"
          ? a.price - b.price
          : sort === "duration"
            ? a.duration - b.duration
            : a.depart.localeCompare(b.depart),
      );
  }, [trips, searchCriteria, direct, sort]);
  return (
    <>
      <section className="hero">
        <p className="eyebrow">DOBRY KIERUNEK</p>
        <h1>
          Miasto za miastem.
          <br />
          <em>Bez pośpiechu.</em>
        </h1>
        <p className="lead">Wybierz trasę, która pasuje do Twojego dnia.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearchCriteria({ from, to, date });
          }}
        >
          <label>
            Skąd
            <input
              list="cities"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            />
          </label>
          <label>
            Dokąd
            <input
              list="cities"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </label>
          <datalist id="cities">
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <label>
            Kiedy
            <input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <button className="button">Szukaj połączeń →</button>
        </form>
      </section>
      <section className="results">
        <div className="section-head">
          <div>
            <h2>
              Połączenia
              {searchCriteria && ` · ${searchCriteria.from} – ${searchCriteria.to}`}
            </h2>
          </div>
          <div className="filters">
            <label>
              <input
                type="checkbox"
                checked={direct}
                onChange={(e) => setDirect(e.target.checked)}
              />{" "}
              Bez przesiadek
            </label>
            <label>
              Sortuj
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="depart">Odjazd</option>
                <option value="price">Cena</option>
                <option value="duration">Czas podróży</option>
              </select>
            </label>
          </div>
        </div>
        {!searchCriteria ? (
          <p className="empty">
            Wpisz trasę i datę, a następnie wybierz „Szukaj połączeń”.
          </p>
        ) : matches.length ? (
          matches.map((t) => (
            <article className="trip" key={t.id}>
              <div className="times">
                <b>{t.depart}</b>
                <span className="line" />
                <b>
                  {new Date(
                    new Date(`2000-01-01T${t.depart}`).getTime() + t.duration * 60000,
                  )
                    .toTimeString()
                    .slice(0, 5)}
                </b>
              </div>
              <div className="route">
                <b>{t.from}</b>
                <span>
                  {Math.floor(t.duration / 60)} godz. {t.duration % 60} min ·{" "}
                  {t.transfers ? "1 przesiadka" : "bezpośrednio"}
                </span>
                <b>{t.to}</b>
              </div>
              <div className="price">
                <b>{money(t.price)}</b>
                <small>od / os.</small>
                <button
                  className="button"
                  onClick={() => {
                    sessionStorage.setItem("trip", t.id);
                    navigate(`/trip/${t.id}`);
                  }}
                >
                  Szczegóły →
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="empty">"Brak połączeń dla wybranej trasy i daty."</p>
        )}
      </section>
    </>
  );
}
export function Details({ trips }: { trips: Trip[] }) {
  const { id } = useParams(),
    t = trips.find((x) => x.id === id),
    nav = useNavigate();
  if (!t) return <p className="notice">Nie znaleziono połączenia.</p>;
  return (
    <section className="panel">
      <Link to="/">← Wróć do wyników</Link>
      <p className="eyebrow">SZCZEGÓŁY PODRÓŻY</p>
      <h1>
        {t.from}
        <br />
        <em>do {t.to}</em>
      </h1>
      <div className="detail-grid">
        <div>
          <small>ODJAZD</small>
          <h2>{t.depart}</h2>
          {t.from}
        </div>
        <div>
          <small>PRZYJAZD</small>
          <h2>
            {new Date(new Date(`2000-01-01T${t.depart}`).getTime() + t.duration * 60000)
              .toTimeString()
              .slice(0, 5)}
          </h2>
          {t.to}
        </div>
        <div>
          <small>CZAS</small>
          <h2>
            {Math.floor(t.duration / 60)}h {t.duration % 60}m
          </h2>
          {t.transfers ? "1 przesiadka" : "bezpośrednio"}
        </div>
      </div>
      <h3>Przebieg trasy</h3>
      <ol>
        {t.stops.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="notice">Przykładowy rozkład i ceny. Rezerwacja demonstracyjna.</p>
      <button
        className="button"
        onClick={() => {
          sessionStorage.setItem("trip", t.id);
          nav("/booking");
        }}
      >
        Wybierz połączenie · od {money(t.price)} →
      </button>
    </section>
  );
}
export function Booking({ trips }: { trips: Trip[] }) {
  const t = trips.find((x) => x.id === sessionStorage.getItem("trip")),
    nav = useNavigate(),
    [klass, setKlass] = useState("2 klasa"),
    [normal, setNormal] = useState(1),
    [reduced, setReduced] = useState(0);
  if (!t) return <p className="notice">Najpierw wybierz połączenie.</p>;
  const total = (normal + reduced * 0.5) * t.price * (klass === "1 klasa" ? 1.45 : 1);
  return (
    <section className="panel">
      <Link to={`/trip/${t.id}`}>← Szczegóły połączenia</Link>
      <p className="eyebrow">REZERWACJA</p>
      <h1>Skład podróży</h1>
      <p>
        {t.from} → {t.to} · {t.depart}
      </p>
      <div className="choice">
        <label>
          Klasa
          <select value={klass} onChange={(e) => setKlass(e.target.value)}>
            <option>2 klasa</option>
            <option>1 klasa</option>
          </select>
        </label>
        <label>
          Bilety normalne
          <select value={normal} onChange={(e) => setNormal(+e.target.value)}>
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Bilety ulgowe
          <select value={reduced} onChange={(e) => setReduced(+e.target.value)}>
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="total">
        Suma <b>{money(total)}</b>
      </p>
      <button
        disabled={!normal && !reduced}
        className="button"
        onClick={() => {
          sessionStorage.setItem(
            "draft",
            JSON.stringify({ tripId: t.id, klass, normal, reduced, total }),
          );
          nav("/summary");
        }}
      >
        Podsumowanie →
      </button>
    </section>
  );
}
export function Summary({ trips }: { trips: Trip[] }) {
  const d = JSON.parse(sessionStorage.getItem("draft") || "null") as
      (Draft & { total: number }) | null,
    t = trips.find((x) => x.id === d?.tripId),
    [done, setDone] = useState(false);
  if (!d || !t)
    return <p className="notice">Brak aktywnej rezerwacji. Wybierz połączenie.</p>;
  return (
    <section className="panel">
      <Link to="/booking">← Zmień bilety</Link>
      <p className="eyebrow">PODSUMOWANIE</p>
      <h1>Gotowi do drogi?</h1>
      <div className="summary">
        <p>
          {t.from} → {t.to}
        </p>
        <p>
          {t.depart} · {d.klass}
        </p>
        <p>
          Bilety normalne: {d.normal} · ulgowe: {d.reduced}
        </p>
        <h2>
          Suma <b>{money(d.total)}</b>
        </h2>
      </div>
      {done ? (
        <p className="notice">Rezerwacja zapisana w tej przeglądarce. Dziękujemy!</p>
      ) : (
        <button
          className="button"
          onClick={() => {
            const list = JSON.parse(localStorage.getItem("bookings") || "[]");
            list.unshift({ ...d, trip: t, createdAt: new Date().toISOString() });
            localStorage.setItem("bookings", JSON.stringify(list));
            setDone(true);
          }}
        >
          Potwierdź rezerwację demonstracyjną →
        </button>
      )}
    </section>
  );
}
