"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { dict, type Key } from "@/lib/i18n";
import type { Lang } from "@/lib/domain";
type Context = {
  lang: Lang;
  t: (key: Key) => string;
  setLang: (lang: Lang) => void;
};
const Language = createContext<Context>({
  lang: "en",
  t: (key) => dict("en")[key],
  setLang: () => {},
});
export function LanguageProvider({
  initial,
  children,
}: {
  initial: Lang;
  children: ReactNode;
}) {
  const [lang, setLanguage] = useState<Lang>(initial);
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("sbk-language", lang);
    document.cookie = `sbk_language=${lang};path=/;max-age=31536000;SameSite=Lax`;
  }, [lang]);
  return (
    <Language.Provider
      value={{ lang, t: (key) => dict(lang)[key], setLang: setLanguage }}
    >
      {children}
    </Language.Provider>
  );
}
export const useLanguage = () => useContext(Language);
export async function action(kind: string, data: unknown = {}) {
  const response = await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, data }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "networkError");
  return result;
}
export function ErrorMessage({ message }: { message: string }) {
  const { t } = useLanguage();
  return message ? (
    <p className="message error" role="alert">
      {t(message in dict("en") ? (message as Key) : "networkError")}
    </p>
  ) : null;
}
export function LanguageSwitch({ member }: { member?: boolean }) {
  const { lang, setLang, t } = useLanguage();
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="language-switch"
        aria-label={t("language")}
        onClick={async () => {
          const value = lang === "en" ? "ml" : "en";
          setLang(value);
          if (member) {
            try {
              const r = await fetch("/api/language", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ language: value }),
              });
              if (!r.ok) throw new Error();
            } catch {
              setError("networkError");
            }
          }
        }}
      >
        <span className={lang === "ml" ? "selected" : ""}>മലയാളം</span>
        <span className={lang === "en" ? "selected" : ""}>EN</span>
      </button>
      <ErrorMessage message={error} />
    </>
  );
}
