import { useEffect, useState } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { Booking, Details, Search, Summary } from "./pages";
import type { Trip } from "./types";

export function App() {
  const [cities, setCities] = useState<string[]>([]),
    [trips, setTrips] = useState<Trip[]>([]),
    [error, setError] = useState("");
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
    <BrowserRouter>
      <header>
        <Link className="brand" to="/">
          <b>↗</b> peron<span>.</span>
        </Link>
        <small>PODRÓŻ ZACZYNA SIĘ TUTAJ</small>
      </header>
      <main>
        {error ? (
          <p className="notice">{error}</p>
        ) : !cities.length ? (
          <p className="notice">Wczytuję rozkład…</p>
        ) : (
          <Routes>
            <Route path="/" element={<Search cities={cities} trips={trips} />} />
            <Route path="/trip/:id" element={<Details trips={trips} />} />
            <Route path="/booking" element={<Booking trips={trips} />} />
            <Route path="/summary" element={<Summary trips={trips} />} />
            <Route path="*" element={<Search cities={cities} trips={trips} />} />
          </Routes>
        )}
        <footer className="site-footer">
          <Link className="footer-brand" to="/">
            peron<span>.</span>
          </Link>
          <p>Znajdź swoją trasę i ruszaj w drogę.</p>
          <Link to="/">Wyszukaj połączenie ↑</Link>
        </footer>
      </main>
    </BrowserRouter>
  );
}
