"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button, FormField, Input } from "@/components/ui";

type Tab = "password" | "code";

type ForgotPhase = "email" | "otp" | "newPassword" | "done";

export function ClientLoginPanel() {
  const t = useTranslations("clientLogin");
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("password");

  /* ─── Shared state ─────────────────────────────────────────────────────── */

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ─── Password tab ─────────────────────────────────────────────────────── */

  const [password, setPassword] = useState("");
  const [forgotPhase, setForgotPhase] = useState<ForgotPhase>("email");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handlePasswordLogin() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/client-auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      setBusy(false);

      if (res.status === 429) {
        setError(t("rateLimited"));
        return;
      }
      if (!res.ok) {
        setError(t("invalidCredentials"));
        return;
      }

      router.push("/moje-zajecia");
    } catch {
      setBusy(false);
      setError(t("errors.generic"));
    }
  }

  function enterForgotPassword() {
    setForgotPhase("email");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  async function sendForgotOtp() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/client-auth/request-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setBusy(false);

      if (res.status === 429) {
        setError(t("rateLimited"));
        return;
      }
      if (!res.ok) {
        setError(t("errors.generic"));
        return;
      }

      setForgotPhase("otp");
    } catch {
      setBusy(false);
      setError(t("errors.generic"));
    }
  }

  async function verifyForgotOtp() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/client-auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });
      setBusy(false);

      if (res.status === 429) {
        setError(t("rateLimited"));
        return;
      }
      if (!res.ok) {
        setError(t("otpInvalid"));
        return;
      }

      setForgotPhase("newPassword");
    } catch {
      setBusy(false);
      setError(t("errors.generic"));
    }
  }

  async function submitNewPassword() {
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError(t("passwordWeak"));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/client-auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: otpCode, password: newPassword }),
      });
      setBusy(false);

      if (res.status === 429) {
        setError(t("rateLimited"));
        return;
      }
      if (!res.ok) {
        setError(t("errors.generic"));
        return;
      }

      setForgotPhase("done");
    } catch {
      setBusy(false);
      setError(t("errors.generic"));
    }
  }

  function resetForgot() {
    setForgotPhase("email");
    setPassword("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  /* ─── Code tab ─────────────────────────────────────────────────────────── */

  const [codePhase, setCodePhase] = useState<"contact" | "otp">("contact");
  const [code, setCode] = useState("");

  async function requestCode() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/client-auth/request-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setBusy(false);

      if (res.status === 429) {
        setError(t("rateLimited"));
        return;
      }
      if (!res.ok) {
        setError(t("errors.generic"));
        return;
      }

      setCodePhase("otp");
    } catch {
      setBusy(false);
      setError(t("errors.generic"));
    }
  }

  async function verifyCode() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/client-auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      setBusy(false);

      if (res.status === 429) {
        setError(t("rateLimited"));
        return;
      }
      if (!res.ok) {
        setError(t("otpInvalid"));
        return;
      }

      router.push("/moje-zajecia");
    } catch {
      setBusy(false);
      setError(t("errors.generic"));
    }
  }

  function switchToCodeTab() {
    setTab("code");
    setError(null);
  }

  function switchToPasswordTab() {
    setTab("password");
    setError(null);
  }

  /* ─── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setTab("password")}
          className={`flex-1 pb-2 text-sm font-medium ${
            tab === "password"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {t("passwordTab")}
        </button>
        <button
          type="button"
          onClick={() => setTab("code")}
          className={`flex-1 pb-2 text-sm font-medium ${
            tab === "code"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {t("codeTab")}
        </button>
      </div>

      {tab === "password" && forgotPhase !== "email" ? (
        /* ─── Forgot password flow ──────────────────────────────────────── */

        <div className="space-y-4">
          {forgotPhase === "otp" ? (
            <>
              <p className="text-muted-foreground text-sm">
                {t("forgotPasswordHeading")}
              </p>
              <FormField label={t("codeLabel")} htmlFor="ll-forgot-code">
                <Input
                  id="ll-forgot-code"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </FormField>
              {error ? <FieldError>{error}</FieldError> : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={verifyForgotOtp}
                  disabled={busy || otpCode.length !== 6}
                >
                  {busy ? t("verifying") : t("verifyCode")}
                </Button>
                <Button type="button" variant="ghost" onClick={resetForgot} disabled={busy}>
                  {t("backToLogin")}
                </Button>
              </div>
            </>
          ) : forgotPhase === "newPassword" ? (
            <>
              <p className="text-muted-foreground text-sm">
                {t("forgotPasswordHeading")}
              </p>
              <FormField label={t("newPasswordLabel")} htmlFor="ll-new-pw">
                <Input
                  id="ll-new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </FormField>
              <FormField label={t("confirmPasswordLabel")} htmlFor="ll-confirm-pw">
                <Input
                  id="ll-confirm-pw"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </FormField>
              <p className="text-muted-foreground text-xs">{t("passwordHint")}</p>
              {error ? <FieldError>{error}</FieldError> : null}
              <Button type="button" onClick={submitNewPassword} disabled={busy}>
                {busy ? t("resetting") : t("resetSubmit")}
              </Button>
            </>
          ) : (
            /* done */
            <div className="space-y-3">
              <p className="text-sm text-green-700">{t("resetSuccess")}</p>
              <Button type="button" variant="outline" onClick={resetForgot}>
                {t("backToLogin")}
              </Button>
            </div>
          )}
        </div>
      ) : tab === "password" && forgotPhase === "email" ? (
        /* ─── Forgot password — send code step ──────────────────────────── */

        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {t("forgotPasswordHeading")}
          </p>
          <p className="text-sm">{t("forgotPasswordDescription", { email })}</p>
          {error ? <FieldError>{error}</FieldError> : null}
          <div className="flex gap-2">
            <Button type="button" onClick={sendForgotOtp} disabled={busy}>
              {busy ? t("sendingCode") : t("sendCode")}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForgot} disabled={busy}>
              {t("backToLogin")}
            </Button>
          </div>
        </div>
      ) : tab === "password" ? (
        /* ─── Password login ────────────────────────────────────────────── */

        <div className="space-y-4">
          <FormField label={t("emailLabel")} htmlFor="ll-login-email">
            <Input
              id="ll-login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label={t("passwordLabel")} htmlFor="ll-login-password">
            <Input
              id="ll-login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          {error ? <FieldError>{error}</FieldError> : null}
          <Button
            type="button"
            onClick={handlePasswordLogin}
            disabled={busy || !email || !password}
            className="w-full"
          >
            {busy ? t("loggingIn") : t("submit")}
          </Button>
          <div className="flex flex-col gap-1 text-sm">
            <button
              type="button"
              onClick={enterForgotPassword}
              className="text-muted-foreground underline self-start"
            >
              {t("forgotPassword")}
            </button>
            <button
              type="button"
              onClick={switchToCodeTab}
              className="text-muted-foreground underline self-start"
            >
              {t("noPasswordLoginWithCode")}
            </button>
          </div>
        </div>
      ) : /* ─── Code login ────────────────────────────────────────────────── */

      codePhase === "contact" ? (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">{t("codeDescription")}</p>
          <FormField label={t("emailLabel")} htmlFor="ll-code-email">
            <Input
              id="ll-code-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          {error ? <FieldError>{error}</FieldError> : null}
          <Button
            type="button"
            onClick={requestCode}
            disabled={busy || !email}
            className="w-full"
          >
            {busy ? t("sendingCode") : t("sendCode")}
          </Button>
          <button
            type="button"
            onClick={switchToPasswordTab}
            className="text-muted-foreground underline text-sm self-start"
          >
            {t("wantToUsePassword")}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">{t("otpPrompt", { email })}</p>
          <FormField label={t("codeLabel")} htmlFor="ll-code-input">
            <Input
              id="ll-code-input"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </FormField>
          {error ? <FieldError>{error}</FieldError> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={verifyCode}
              disabled={busy || code.length !== 6}
              className="flex-1"
            >
              {busy ? t("verifying") : t("verifyCode")}
            </Button>
            <Button type="button" variant="ghost" onClick={requestCode} disabled={busy}>
              {t("resendCode")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-destructive text-sm">{children}</p>;
}
