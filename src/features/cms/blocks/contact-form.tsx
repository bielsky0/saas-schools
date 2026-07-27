"use client";

import { useState } from "react";

export { contactFormBlock } from "./contact-form-block";

type ContactFormProps = {
  title?: string | null;
  recipientEmail?: string | null;
  showPhone?: boolean | null;
  showMessage?: boolean | null;
  privacyNote?: string | null;
};

type SubmissionState = {
  status: "idle" | "submitting" | "success" | "error";
  error?: string;
};

export function ContactForm({
  title,
  showPhone,
  showMessage,
  privacyNote,
}: ContactFormProps) {
  const [state, setState] = useState<SubmissionState>({ status: "idle" });

  if (state.status === "success") {
    return (
      <section className="px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <p className="text-lg font-medium text-green-600">
            Thank you for your message. We will get back to you soon.
          </p>
        </div>
      </section>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: "submitting" });

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement)?.value ?? "",
      message: (form.elements.namedItem("message") as HTMLTextAreaElement)?.value ?? "",
      _hp: (form.elements.namedItem("_hp") as HTMLInputElement)?.value ?? "",
    };

    try {
      const res = await fetch("/api/contact-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Submission failed" }));
        setState({ status: "error", error: err.error ?? "Submission failed" });
        return;
      }

      setState({ status: "success" });
    } catch {
      setState({ status: "error", error: "Network error. Please try again." });
    }
  }

  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-md">
        {title && <h2 className="mb-8 text-center text-3xl font-bold">{title}</h2>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot — hidden from real users, bots fill it */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <label htmlFor="_hp">Leave empty</label>
            <input id="_hp" name="_hp" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {showPhone && (
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          )}

          {showMessage && (
            <div>
              <label htmlFor="message" className="mb-1 block text-sm font-medium">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          )}

          {privacyNote && (
            <p className="text-xs text-muted-foreground">{privacyNote}</p>
          )}

          {state.status === "error" && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={state.status === "submitting"}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {state.status === "submitting" ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </section>
  );
}
