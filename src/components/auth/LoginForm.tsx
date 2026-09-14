"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { getCurrentUser } from "@/lib/auth/client";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error || "Login failed");
        setIsLoading(false);
      } else {
        // The session cookie is now set in the browser.
        // We fetch the user's profile to determine the correct redirect path.
        const user = await getCurrentUser();

        if (user && user.profile) {
          const redirectPath = user.profile.role === "ADMIN" ? "/admin" : "/employee";
          window.location.replace(redirectPath);
        } else {
          // Fallback to root if profile cannot be determined
          window.location.replace("/");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred during login.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-status-late">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
        Sign in
      </Button>
      <p className="text-center text-xs text-ink-400">
        Don&apos;t have an account? Ask your admin to set one up for you.
      </p>
    </form>
  );
}
