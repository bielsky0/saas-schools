"use client";

import { getSupabaseClient } from "@/app/supabase-client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

const supabase = getSupabaseClient();

type LoginView = "login" | "forgot_password";

export const LoginScreen = () => {
  const [view, setView] = useState<LoginView>("login");
  const [responseError, setResponseError] = useState("");
  const [responseSuccess, setResponseSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const searchParams = useSearchParams();

  const unauthorized = searchParams.get("unauthorized");
  const sessionExpired = searchParams.get("session_expired");
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponseError("");
    setResponseSuccess("");
    setIsLoading(true);

    try {
      const { error } = await supabase?.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      setResponseError(error instanceof Error && error.message ? error.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponseError("");
    setResponseSuccess("");
    setIsLoading(true);

    try {
      const { error } = await supabase?.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/editor/reset-password`,
      });

      if (error) {
        throw new Error(error.message);
      }
      setResponseSuccess("Check your email for the password reset link");
      setIsLoading(false);
    } catch (error) {
      setResponseError(error instanceof Error && error.message ? error.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setResponseError("");
    setIsLoading(true);

    try {
      const { error } = await supabase?.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      setResponseError(error instanceof Error && error.message ? error.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            {view === "login" ? "Sign in to your account" : "Reset password"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {view === "login"
              ? "Enter your email and password to sign in"
              : "Enter your email to receive reset instructions"}
          </p>
        </div>

        {responseError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{responseError}</div>}

        {responseSuccess && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{responseSuccess}</div>}

        {unauthorized && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            You do not have access to edit this website. Please contact administrator
          </div>
        )}
        {sessionExpired && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            Your session has expired. Please sign in again.
          </div>
        )}

        {view === "login" ? (
          <form className="space-y-6" onSubmit={handleEmailLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border-gray-300 py-1.5 text-gray-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                  Password
                </label>
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setView("forgot_password");
                      setResponseError("");
                      setResponseSuccess("");
                    }}
                    className="font-semibold text-blue-600 hover:text-blue-500">
                    Forgot password?
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border-gray-300 py-1.5 text-gray-900"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50">
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handleResetPassword}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border-gray-300 py-1.5 text-gray-900"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50">
                {isLoading ? "Sending..." : "Send reset instructions"}
              </button>
            </div>
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setResponseError("");
                  setResponseSuccess("");
                }}
                className="font-semibold text-blue-600 hover:text-blue-500">
                Back to sign in
              </button>
            </div>
          </form>
        )}

        <div className="relative hidden">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="hidden">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </button>
        </div>
      </div>
    </div>
  );
};
