"use client";
import { useState } from "react";
import { ArrowRight, ShieldCheck, Users, Target, Clock3 } from "lucide-react";
import { action, ErrorMessage, LanguageSwitch, useLanguage } from "./provider";
import type { Row } from "@/lib/db";
import { countryCodes } from "@/lib/countries";
import { PasswordInput } from "./password-input";
export function AuthScreen({
  user,
  demo,
}: {
  user?: Row | null;
  demo: boolean;
}) {
  const { t, lang } = useLanguage();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login"),
    [busy, setBusy] = useState(false),
    [loginType, setLoginType] = useState<"phone" | "email">("phone"),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <div className="welcome-page">
      <header>
        <a className="welcome-brand" href="/">
          <img src="/sbk-logo.png" alt="Soccer Blues of Keralam" />
          <span>{t("community")}</span>
        </a>
        <LanguageSwitch />
      </header>
      {demo && <div className="demo-bar">{t("demo")}</div>}
      <main className="welcome-grid">
        <section className="welcome-pitch">
          <div className="eyebrow">
            <span /> {t("title")}
          </div>
          <h1>{t("welcome")}</h1>
          <p>{t("welcomeText")}</p>
          <div className="welcome-emblem">
            <div className="orbit one" />
            <div className="orbit two" />
            <img src="/sbk-logo.png" alt="SBK Kerala — since 2017" />
            <span className="pitch-word">SBK</span>
          </div>
          <div className="welcome-values">
            <span>
              <Target />
              {t("exact")} <b>1</b>
            </span>
            <span>
              <Users />
              {t("correct")} <b>1</b>
            </span>
          </div>
        </section>
        <section className="auth-card">
          {user ? (
            <>
              <Clock3 className="status-icon" size={38} />
              <h2>
                {t(
                  user.membership === "pending"
                    ? "pending"
                    : user.membership === "suspended"
                      ? "suspended"
                      : "rejected",
                )}
              </h2>
              <p>
                {t(
                  user.membership === "pending" ? "pendingText" : "helpAccount",
                )}
              </p>
              <button
                className="button primary"
                onClick={() => location.reload()}
              >
                {t("refresh")}
              </button>
              <button
                className="text-button"
                onClick={async () => {
                  await action("logout");
                  location.href = "/";
                }}
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <>
              <div className="eyebrow dark">{t("community")}</div>
              <h2>{t(mode === "reset" ? "passwordReset" : mode)}</h2>
              <p>{t("access")}</p>
              <div className="segmented">
                <button
                  className={mode === "login" ? "active" : ""}
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setMessage("");
                  }}
                >
                  {t("login")}
                </button>
                <button
                  className={mode === "register" ? "active" : ""}
                  onClick={() => {
                    setMode("register");
                    setError("");
                    setMessage("");
                  }}
                >
                  {t("register")}
                </button>
              </div>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setBusy(true);
                  setError("");
                  setMessage("");
                  const f = new FormData(event.currentTarget);
                  try {
                    const identifier = mode === "login" && loginType === "phone"
                      ? String(f.get("country_code")) + String(f.get("mobile")).replace(/\D/g, "")
                      : f.get("email");
                    const result = await action(mode, {
                      email: identifier,
                      password: f.get("password") ?? undefined,
                      display_name: f.get("display_name") ?? undefined,
                      language: lang,
                    });
                    if (result.confirm) setMessage("confirmEmail");
                    else if (result.message) setMessage(result.message);
                    else location.href = "/home";
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {mode === "register" && (
                  <label>
                    {t("display_name")}
                    <input
                      name="display_name"
                      required
                      minLength={2}
                      maxLength={50}
                      autoComplete="nickname"
                    />
                  </label>
                )}
                {mode === "login" && (
                  <label>
                    {t("accountType")}
                    <select value={loginType} onChange={(event) => setLoginType(event.target.value as "phone" | "email")}>
                      <option value="phone">{t("mobileNumber")}</option>
                      <option value="email">{t("email")}</option>
                    </select>
                  </label>
                )}
                {mode === "login" && loginType === "phone" ? (
                  <div className="phone-input-row">
                    <label>{t("countryCode")}<select name="country_code" defaultValue="+91">{countryCodes.map(([country, code]) => <option value={code} key={country + code}>{country} {code}</option>)}</select></label>
                    <label>{t("mobileNumber")}<input name="mobile" required inputMode="numeric" pattern="[0-9 ]{6,15}" autoComplete="tel-national" /></label>
                  </div>
                ) : (
                  <label>
                    {t("email")}
                    <input name="email" type="email" required autoComplete="email" maxLength={254} />
                  </label>
                )}
                {mode !== "reset" && (
                  <label>
                    {t("password")}
                    <PasswordInput
                      name="password"
                      required
                      minLength={10}
                      maxLength={128}
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                    />
                  </label>
                )}
                <ErrorMessage message={error} />
                {message && (
                  <p role="status" className="message success">
                    {t(message as Parameters<typeof t>[0])}
                  </p>
                )}
                <button className="button primary full" disabled={busy}>
                  {busy
                    ? t("saving")
                    : t(mode === "reset" ? "passwordReset" : mode)}
                  <ArrowRight size={19} />
                </button>
              </form>
              <button className="text-button" onClick={() => setMode("reset")}>
                {t("passwordReset")}
              </button>
              <div className="auth-note">
                <ShieldCheck size={20} />
                <span>{t("free")}</span>
              </div>
            </>
          )}
        </section>
      </main>
      <footer>{t("freeNote")}</footer>
    </div>
  );
}
