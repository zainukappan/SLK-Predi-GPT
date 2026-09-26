"use client";
import { useState } from "react";
import { action, ErrorMessage, useLanguage } from "@/components/provider";
import { PasswordInput } from "@/components/password-input";
export default function Reset() {
  const { t } = useLanguage(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="error-page">
      <section className="panel">
        <h1>{t("setPassword")}</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await action("password", {
                password: new FormData(e.currentTarget).get("password"),
              });
              location.href = "/home";
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {t("newPassword")}
            <PasswordInput
              name="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
            />
          </label>
          <ErrorMessage message={error} />
          <button className="button primary" disabled={busy}>
            {t("save")}
          </button>
        </form>
      </section>
    </main>
  );
}
