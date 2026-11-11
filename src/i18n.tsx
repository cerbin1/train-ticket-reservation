import { createContext, useContext, useState, type ReactNode } from "react";
import { readStored, writeStored } from "./storage";

export type Language = "en" | "pl";
type Translator = (polish: string, english: string) => string;
type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  tr: Translator;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const isLanguage = (value: unknown): value is Language =>
  value === "en" || value === "pl";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = readStored("localStorage", "language", isLanguage);
    return saved.value ?? "en";
  });

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    writeStored("localStorage", "language", nextLanguage);
  };

  const tr: Translator = (polish, english) => (language === "pl" ? polish : english);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
