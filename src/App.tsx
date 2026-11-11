import { useEffect, useState } from "react";
import { HashRouter, Link, Route, Routes } from "react-router-dom";
import { Booking, Details, SavedTrips, Search, Summary } from "./pages";
import type { Trip } from "./types";
import { useLanguage } from "./i18n";

export function App() {
  const { language, setLanguage, tr } = useLanguage();
  const [cities, setCities] = useState<string[]>([]),
    [trips, setTrips] = useState<Trip[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    document.documentElement.lang = language;
    document.title =
      language === "en" ? "Peron — train journeys" : "Peron — rezerwacja podróży";
  }, [language]);
  useEffect(() => {
    Promise.all([
      fetch("/data/cities.json").then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      }),
      fetch("/data/trips.json").then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      }),
    ])
      .then(([c, t]) => {
        setCities(c);
        setTrips(t);
      })
      .catch(() =>
        setError(
          "Nie udało się wczytać rozkładu. Odśwież stronę, aby spróbować ponownie.",
        ),
      );
  }, []);
  return (
    <HashRouter>
      <header>
        <Link className="brand" to="/">
          <b>↗</b> peron<span>.</span>
        </Link>
        <small>{tr("PODRÓŻ ZACZYNA SIĘ TUTAJ", "YOUR JOURNEY STARTS HERE")}</small>
        <nav
          className="header-links"
          aria-label={tr("Nawigacja główna", "Main navigation")}
        >
          <Link to="/saved">{tr("Ulubione i rezerwacje", "Saved trips & bookings")}</Link>
        </nav>
        <label className="language-select">
          <span className="visually-hidden">{tr("Język", "Language")}</span>
          <select
            aria-label={tr("Język", "Language")}
            value={language}
            onChange={(event) => setLanguage(event.target.value as "en" | "pl")}
          >
            <option value="en">EN</option>
            <option value="pl">PL</option>
          </select>
        </label>
      </header>
      <main>
        {error ? (
          <p className="notice">
            {error ===
            "Nie udało się wczytać rozkładu. Odśwież stronę, aby spróbować ponownie."
              ? tr(error, "Could not load the timetable. Refresh the page to try again.")
              : error}
          </p>
        ) : !cities.length ? (
          <p className="notice">{tr("Wczytuję rozkład…", "Loading timetable…")}</p>
        ) : (
          <Routes>
            <Route path="/" element={<Search cities={cities} trips={trips} />} />
            <Route path="/trip/:id" element={<Details trips={trips} />} />
            <Route path="/booking" element={<Booking trips={trips} />} />
            <Route path="/summary" element={<Summary trips={trips} />} />
            <Route path="/saved" element={<SavedTrips />} />
            <Route path="*" element={<Search cities={cities} trips={trips} />} />
          </Routes>
        )}
        <footer className="site-footer">
          <Link className="footer-brand" to="/">
            peron<span>.</span>
          </Link>
          <p>
            {tr("Znajdź swoją trasę i ruszaj w drogę.", "Find your route and set off.")}
          </p>
          <Link to="/">{tr("Wyszukaj połączenie ↑", "Search trains ↑")}</Link>
        </footer>
      </main>
    </HashRouter>
  );
}
