import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { translations, type Language, type TranslationKey, getStoredLanguage, setStoredLanguage, getLanguageDir } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType | null>(null);

async function persistLanguageToServer(lang: Language): Promise<void> {
  try {
    await fetch(`${BASE}/api/users/me`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uiLanguage: lang }),
    });
  } catch {
    // Ignore — localStorage already saved it
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);
  const dir = getLanguageDir(language);

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setStoredLanguage(lang);
    persistLanguageToServer(lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const dict = translations[language] as Record<string, string> | undefined;
      const fallback = translations.en as Record<string, string>;
      const value = dict?.[key] ?? fallback[key] ?? key;
      if (import.meta.env.DEV && language !== "en" && !dict?.[key]) {
        console.warn(`[i18n] Missing "${language}" translation for key: "${key}"`);
      }
      return value;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

const FALLBACK: LanguageContextType = {
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
  dir: "ltr",
};

export function useLanguage() {
  return useContext(LanguageContext) ?? FALLBACK;
}
